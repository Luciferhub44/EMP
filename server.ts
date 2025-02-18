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
  role: 'admin' | 'employee';
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


// Helper function for password hashing
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${hash}:${salt}`;
}

// Helper function for password verification
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Split the stored hash into salt and hash parts
    const [hashedPart, salt] = storedHash.split(':');
    
    // Hash the provided password with the same salt
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    
    // Compare the hashes
    return hash === hashedPart;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../dist')));

// Configure database pool with better settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


// API health check
app.get('/api/db/test', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      message: process.env.NODE_ENV === 'production' ? (error as Error).message : undefined
    });
  }
});

// Catch-all route for SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { agentId, password } = req.body;
    
    const result = await pool.query(
      'SELECT data FROM employees WHERE data->>\'agentId\' = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const employee = result.rows[0].data;
    const isValid = await verifyPassword(password, employee.passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken();
    const session: Session = {
      token,
      employeeId: employee.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    await pool.query(
      'INSERT INTO sessions (id, data) VALUES ($1, $2)',
      [token, session]
    );

    const { passwordHash, ...safeEmployee } = employee;
    res.json({ user: safeEmployee, token });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const result = await pool.query(
      'SELECT data FROM sessions WHERE data->>\'token\' = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const session = result.rows[0].data;
    const employeeResult = await pool.query(
      'SELECT data FROM employees WHERE id = $1',
      [session.employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ message: 'Employee not found' });
    }

    const employee = employeeResult.rows[0].data;
    const { passwordHash, ...safeEmployee } = employee;

    res.json({ user: safeEmployee });
  } catch (error) {
    console.error('Session validation failed:', error);
    res.status(500).json({ message: 'Session validation failed' });
  }
});

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
          data ? 'email' AND
          data ? 'name' AND
          data ? 'role'
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
    await client.query('BEGIN');

    // Create tables
    for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
      console.log(`Creating table: ${tableName}`);
      await client.query(tableSchema);
    }

    // Create indexes
    for (const [indexName, indexSchema] of Object.entries(schema.indexes)) {
      console.log(`Creating index: ${indexName}`);
      await client.query(indexSchema);
    }

    // Insert initial employee data
    console.log('Inserting initial data...');
    const initialEmployees = [
      {
        id: "EMP001",
        agentId: "ADMIN001",
        name: "Admin HQ",
        email: "hq@sanyglobal.org",
        role: "admin",
        status: "active",
        passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73" // "sany444global"
      },
      {
        id: "EMP002",
        agentId: "AGENT48392",
        name: "David PIERRE-JEAN",
        email: "david.pierrejean@sanyglobal.org",
        role: "employee",
        status: "active",
        passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73" // "sany2025global"
      }
    ];

    for (const employee of initialEmployees) {
      await client.query(
        'INSERT INTO employees (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
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