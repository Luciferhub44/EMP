import pkg from 'pg';
const { Pool } = pkg;

import express, { Router, Request, Response } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cors from 'cors';
import { warehouses } from "./src/data/warehouses.js"
import { products } from "./src/data/products.js"
import { employees } from "./src/data/employees.js"
import { customers } from "./src/data/customers.js"
import { fulfillments } from "./src/data/fulfillments.js"
import { orders } from "./src/data/orders.js"
import { transportCompanies, transportOrders } from "./src/data/transport.js"
import { defaultSettings } from './src/config/default-settings.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
// Interfaces
interface DbRow {
  data: any;
}

interface Employee {
  id: string;
  agentId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  passwordHash: string;
  settings?: any;
}

interface Session {
  token: string;
  employeeId: string;
  expiresAt: string;
}

interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Fulfillment {
  id: string;
  orderId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
  history: FulfillmentHistory[];
  createdAt: string;
  updatedAt: string;
}

interface FulfillmentHistory {
  status: string;
  timestamp: string;
  note?: string;
}

interface TransportQuote {
  id: string;
  orderId: string;
  provider: string;
  method: string;
  cost: number;
  estimatedDays: number;
  distance: number;
  insurance: {
    included: boolean;
    cost?: number;
  };
  validUntil: string;
  status: 'pending' | 'accepted' | 'expired';
}

interface Inventory {
  productId: string;
  warehouseId: string;
  quantity: number;
  lastUpdated: string;
}

export interface Payment {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  type: 'salary' | 'bonus' | 'commission';
  description: string;
  reference?: string;
  period: {
    start: string;
    end: string;
  };
  createdAt: string;
  paidAt?: string;
}

// Add new FulfillmentPayment interface (keep existing Payment interface for payroll)
interface FulfillmentPayment {
  id: string;
  fulfillmentId: string;
  userId: string;
  amount: number;
  method: 'bank-wire' | 'crypto';
  status: 'pending' | 'confirmed' | 'rejected';
  receipt: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

const DEFAULT_PORT = Number(process.env.PORT) || 3001;
const MAX_PORT_RETRIES = 10;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = DEFAULT_PORT;

// Add these near the top of the file
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hq@sanyglobal.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sany444global';
const ADMIN_ID = 'ADMIN001';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../dist')));

// Add auth routes here
const authRouter = Router();

// Login endpoint
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { agentId, password } = req.body;

    if (!agentId || !password) {
      return res.status(400).json({ message: 'Agent ID and password are required' });
    }

    // Find employee by agentId
    const result = await pool.query(
      `SELECT data FROM employees WHERE data->>'agentId' = $1`,
      [agentId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const employee = result.rows[0].data;
    const isValidPassword = await verifyPassword(password, employee.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (employee.status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    await pool.query(
      'INSERT INTO sessions (id, data, expires_at) VALUES ($1, $2, $3)',
      [
        token,
        {
          token,
          employeeId: employee.id,
          expiresAt: expiresAt.toISOString()
        },
        expiresAt
      ]
    );

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = employee;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Session validation endpoint
authRouter.get('/session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const result = await pool.query(
      `SELECT data FROM sessions WHERE data->>'token' = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    const session = result.rows[0].data;
    const employeeResult = await pool.query(
      `SELECT data FROM employees WHERE data->>'id' = $1`,
      [session.employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const employee = employeeResult.rows[0].data;
    const { passwordHash, ...userWithoutPassword } = employee;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout endpoint
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await pool.query(
        `DELETE FROM sessions WHERE data->>'token' = $1`,
        [token]
      );
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add auth routes to app
app.use('/api/auth', authRouter);

// Start server with enhanced error handling
async function startServer() {
  try {
    await initializeDatabase();
    
    const port = await findAvailablePort(DEFAULT_PORT);
    const server = app.listen(port, () => {
      console.info(`Server running on port ${port}`);
      console.info(`Environment: ${process.env.NODE_ENV}`);
      console.info('Database initialized and connected');
    });
    
    // Keep track of connections
    let connections = new Set();
    
    server.on('connection', (connection) => {
      connections.add(connection);
      connection.on('close', () => connections.delete(connection));
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Database Schema and Initialization
const SCHEMA_VERSION = '1.0.0';

// Complete schema definitions with JSONB constraints
const schema = {
  tables: {
    schema_versions: `
      CREATE TABLE IF NOT EXISTS schema_versions (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `,
    employees: `
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT employees_data_check CHECK (
          data ? 'id' AND
          data ? 'agentId' AND
          data ? 'email' AND
          data ? 'name' AND
          data ? 'status' AND
          data ? 'passwordHash'
        )
      )
    `,
    sessions: `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT sessions_data_check CHECK (
          data ? 'token' AND
          data ? 'employeeId' AND
          data ? 'expiresAt'
        )
      )
    `,
    orders: `
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT orders_data_check CHECK (
          data ? 'id' AND
          data ? 'customerId' AND
          data ? 'status' AND
          data ? 'items' AND
          data ? 'totalAmount'
        )
      )
    `,
    products: `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT products_data_check CHECK (
          data ? 'id' AND
          data ? 'name' AND
          data ? 'price'
        )
      )
    `,
    customers: `
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT customers_data_check CHECK (
          data ? 'id' AND
          data ? 'name' AND
          data ? 'email'
        )
      )
    `
  },
  indexes: {
    employees_agent_id: `CREATE INDEX IF NOT EXISTS idx_employees_agent_id ON employees ((data->>'agentId'))`,
    employees_email: `CREATE INDEX IF NOT EXISTS idx_employees_email ON employees ((data->>'email'))`,
    sessions_token: `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions ((data->>'token'))`,
    orders_customer: `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders ((data->>'customerId'))`,
    orders_status: `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders ((data->>'status'))`,
    products_name: `CREATE INDEX IF NOT EXISTS idx_products_name ON products ((data->>'name'))`,
    customers_email: `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers ((data->>'email'))`
  }
};

// Database initialization
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Drop everything in the current database
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all sequences
        FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
        END LOOP;
        
        -- Drop all views
        FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Start transaction for new schema creation
    await client.query('BEGIN');

    // Create tables and indexes
    for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
      console.log(`Creating table: ${tableName}`);
      await client.query(tableSchema);
    }

    for (const [indexName, indexSchema] of Object.entries(schema.indexes)) {
      console.log(`Creating index: ${indexName}`);
      await client.query(indexSchema);
    }

    // Insert initial data
    console.log('Inserting initial data...');
    const initialEmployees = [
      {
        id: "EMP001",
        agentId: "ADMIN001",
        name: "Admin HQ",
        email: "hq@sanyglobal.org",
        status: "active",
        passwordHash: await hashPassword(ADMIN_PASSWORD)
      }
    ];

    for (const employee of initialEmployees) {
      await client.query(
        'INSERT INTO employees (id, data) VALUES ($1, $2)',
        [employee.id, employee]
      );
    }

    await client.query('COMMIT');
    console.log('Database initialization complete');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Cleanup expired sessions
async function cleanupExpiredSessions() {
  try {
    await pool.query(
      "DELETE FROM sessions WHERE (data->>'expires_at')::timestamptz < NOW()"
    );
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
}

// Schedule cleanup job
setInterval(cleanupExpiredSessions, 1000 * 60 * 60); // Run every hour

// Start server with database initialization
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + MAX_PORT_RETRIES; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          server.close();
          resolve(port);
        });
        server.on('error', reject);
      });
      return port;
    } catch (error) {
      if (port === startPort + MAX_PORT_RETRIES - 1) {
        throw error;
      }
      continue;
    }
  }
  throw new Error('No available ports found');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down gracefully');
    
    try {
      // Close database pool
      await pool.end();
      console.info('Database pool closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Export for testing
export { app, pool };

// Utility functions
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return Promise.resolve(`${hash}:${salt}`);
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Split the stored hash into salt and hash parts
      const [hashedPart, salt] = storedHash.split(':');
      
      // Hash the provided password with the same salt
      const hash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
        .toString('hex');
      
      // Compare the hashes
      resolve(hash === hashedPart);
    } catch (error) {
      console.error('Password verification failed:', error);
      resolve(false);
    }
  });
}