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
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  status: 'active' | 'inactive';
  warehouseId?: string;
  passwordHash: string;
  createdAt: string;
  settings: any;
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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? err.message : undefined
  });
});

// Configure database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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

// Start server
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

// Hardcoded employees data
const INITIAL_EMPLOYEES = [
  {
    id: "EMP001",
    agentId: "ADMIN001",
    name: "Admin HQ",
    email: "hq@sanyglobal.org",
    role: "admin",
    status: "active",
    assignedOrders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73", // "sany444global"
    businessInfo: {
      companyName: "Sany Global",
      registrationNumber: "REG123",
      taxId: "TAX123",
      businessAddress: {
        street: "123 Admin St",
        city: "Admin City",
        state: "AS",
        postalCode: "12345",
        country: "USA"
      }
    },
    settings: {
      theme: "light",
      notifications: {
        email: true,
        push: true
      },
      language: "en"
    }
  },
  {
    id: "EMP002",
    agentId: "AGENT48392",
    name: "David PIERRE-JEAN",
    email: "david.pierrejean@sanyglobal.org",
    role: "employee",
    status: "active",
    assignedOrders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73", // "sany2025global"
    businessInfo: {
      companyName: "Sany Equipment",
      registrationNumber: "93-1671162",
      taxId: "93-1671162",
      businessAddress: {
        street: "228 Park Ave S",
        city: "New York",
        state: "NY",
        postalCode: "10003",
        country: "USA"
      }
    },
    settings: {
      theme: "light",
      notifications: {
        email: true,
        push: true
      },
      language: "en"
    }
  }
];

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop and recreate schema
    await client.query(`DROP SCHEMA public CASCADE;`);
    await client.query(`CREATE SCHEMA public;`);
    await client.query(`GRANT ALL ON SCHEMA public TO postgres;`);
    await client.query(`GRANT ALL ON SCHEMA public TO public;`);

    // Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES employees(id),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert hardcoded employees
    for (const employee of INITIAL_EMPLOYEES) {
      await client.query(
        'INSERT INTO employees (id, data) VALUES ($1, $2)',
        [employee.id, employee]
      );
    }

    await client.query('COMMIT');
    console.log('Database initialized with hardcoded employees');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Wrapper function for database queries with error handling
async function executeQuery(queryText: string, params: any[], client: any): Promise<any> {
  try {
    const result = await client.query(queryText, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// API routes
app.post('/api/db/query', async (req, res) => {
  const { text, params } = req.body;
  console.log('Received query:', { text, params });

  try {
    const result = await executeQuery(text, params, pool);
    console.log('Query success:', result.rows.length, 'rows');
    res.json(result.rows.map((row: DbRow) => row.data));
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Query error details:', {
      message: error.message,
      stack: error.stack,
      query: text,
      params: params
    });
    res.status(500).json({ error: error.message });
  }
});

// Add password verification endpoint
app.post('/api/auth/verify', async (req, res) => {
  const { password, hash } = req.body;
  
  try {
    const isValid = await verifyPassword(password, hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Password verification failed:', error);
    res.status(500).json({ error: 'Password verification failed' });
  }
});

// Add this route to check employee data
app.get('/api/debug/employees', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM employees', [], pool);
    console.log('Current employees:', result.rows);
    res.json(result.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// ============= Authentication =============
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { agentId, password } = req.body

    // Find employee by agentId
    const employee = employees.find(emp => emp.agentId === agentId.toUpperCase())
    
    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const [hash, salt] = employee.passwordHash.split(':')
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex')

    if (hash !== verifyHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Create session token
    const token = `session-${employee.id}-${Date.now()}`
    
    // Return sanitized user data
    const { passwordHash, ...safeEmployee } = employee
    
    res.json({
      token,
      user: safeEmployee
    })
  } catch (error) {
    console.error('Login failed:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

app.get('/api/auth/session', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const employeeId = token.split('-')[1]
    const employee = employees.find(emp => emp.id === employeeId)

    if (!employee) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const { passwordHash, ...safeEmployee } = employee
    res.json({ user: safeEmployee })
  } catch (error) {
    console.error('Session validation failed:', error)
    res.status(500).json({ error: 'Session validation failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true })
})

// Add employee creation endpoint (requires admin)
app.post('/api/employees', async (req, res) => {
  const { email, password, role, name, businessInfo } = req.body;
  
  try {
    // TODO: Add admin authentication check here
    
    const id = `EMP${Date.now()}`;
    const passwordHash = await hashPassword(password);
    
    const newEmployee = {
      id,
      agentId: `AGT${Date.now()}`,
      name,
      email,
      role,
      status: 'active',
      assignedOrders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash,
      businessInfo
    };

    await executeQuery(
      'INSERT INTO employees (id, data) VALUES ($1, $2)',
      [newEmployee.id, newEmployee],
      pool
    );

    const { passwordHash: _, ...safeEmployee } = newEmployee;
    res.status(201).json(safeEmployee);
  } catch (error) {
    console.error('Failed to create employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Get user notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = token.replace('session-', '');
    const notificationsResult = await executeQuery(
      'SELECT data FROM notifications WHERE data->>\'userId\' = $1 ORDER BY data->>\'timestamp\' DESC',
      [userId],
      pool
    );

    // If no notifications exist yet, return empty array
    if (notificationsResult.rows.length === 0) {
      return res.json([]);
    }

    res.json(notificationsResult.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get user settings
app.get('/api/settings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = token.replace('session-', '');
    const settingsResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [userId],
      pool
    );

    if (settingsResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return settings or default settings if none exist
    const userSettings = settingsResult.rows[0].data.settings || defaultSettings;
    res.json(userSettings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
app.put('/api/settings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = token.replace('session-', '');
    const newSettings = req.body;

    await executeQuery(
      'UPDATE employees SET data = jsonb_set(data, \'{settings}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify(newSettings), userId],
      pool
    );

    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Orders endpoint
app.get('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const employee = employeeResult.rows[0].data;
    let query = 'SELECT data FROM orders';
    const params: any[] = [];

    if (employee.role !== 'admin') {
      query += ' WHERE data->>\'assignedTo\' = $1';
      params.push(employee.id);
    }

    query += ' ORDER BY data->>\'createdAt\' DESC';
    const ordersResult = await executeQuery(query, params, pool);
    res.json(ordersResult.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Customers endpoint
app.get('/api/customers', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, isAdmin } = req.query;

    // Get employee data to check permissions
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get customers from database
    const customersResult = await executeQuery('SELECT data FROM customers ORDER BY data->>\'createdAt\' DESC', [], pool);
    const customers = customersResult.rows.map((row: DbRow) => row.data);

    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Products endpoint
app.get('/api/products', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const productsResult = await executeQuery('SELECT data FROM products ORDER BY data->>\'createdAt\' DESC', [], pool);
    const products = productsResult.rows.map((row: DbRow) => row.data);
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Dashboard data endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [orders, products, customers] = await Promise.all([
      executeQuery('SELECT COUNT(*) FROM orders', [], pool),
      executeQuery('SELECT COUNT(*) FROM products', [], pool),
      executeQuery('SELECT COUNT(*) FROM customers', [], pool)
    ]);

    res.json({
      totalOrders: parseInt(orders.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      totalCustomers: parseInt(customers.rows[0].count),
      recentActivity: []
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Messages/Threads endpoint
app.get('/api/messages/threads', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Placeholder for messages - you'll need to create a messages table
    res.json([]);
  } catch (error) {
    console.error('Failed to fetch message threads:', error);
    res.status(500).json({ error: 'Failed to fetch message threads' });
  }
});

// Middleware for checking admin role
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (result.rows.length === 0 || result.rows[0].data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Employee management endpoints
app.post('/api/employees/assign-order', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId, orderId } = req.body;

    // Check if employee exists
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [employeeId],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if order exists
    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId],
      pool
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order assignment
    await executeQuery(
      'UPDATE orders SET data = jsonb_set(data, \'{assignedTo}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify(employeeId), orderId],
      pool
    );

    res.json({ success: true, message: 'Order assigned successfully' });
  } catch (error) {
    console.error('Failed to assign order:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// Get all employees (admin only)
app.get('/api/employees', isAdmin, async (req, res) => {
  try {
    const employeesResult = await executeQuery(
      'SELECT data FROM employees ORDER BY data->>\'name\' ASC',
      [],
      pool
    );

    const employees = employeesResult.rows.map((row: DbRow) => {
      const { passwordHash, ...safeEmployee } = row.data;
      return safeEmployee;
    });

    res.json(employees);
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Update employee (admin or self only)
app.put('/api/employees/:employeeId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId } = req.params;
    const updates = req.body;

    // Check permissions
    const requesterResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (requesterResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const requester = requesterResult.rows[0].data;
    if (requester.role !== 'admin' && requester.id !== employeeId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Prevent non-admins from updating role or status
    if (requester.role !== 'admin') {
      delete updates.role;
      delete updates.status;
    }

    await executeQuery(
      'UPDATE employees SET data = data || $1::jsonb WHERE data->>\'id\' = $2',
      [JSON.stringify(updates), employeeId],
      pool
    );

    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Failed to update employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Pending orders endpoint
app.get('/api/orders/pending', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pendingOrdersResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'status\' = $1 ORDER BY data->>\'createdAt\' DESC',
      ['pending'],
      pool
    );
    const pendingOrders = pendingOrdersResult.rows.map((row: DbRow) => row.data);
    res.json(pendingOrders);
  } catch (error) {
    console.error('Failed to fetch pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

// Fulfillments endpoint
app.get('/api/fulfillments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fulfillmentsResult = await executeQuery('SELECT data FROM fulfillments ORDER BY data->>\'createdAt\' DESC', [], pool);
    const fulfillments = fulfillmentsResult.rows.map((row: DbRow) => row.data);
    res.json(fulfillments);
  } catch (error) {
    console.error('Failed to fetch fulfillments:', error);
    res.status(500).json({ error: 'Failed to fetch fulfillments' });
  }
});

// Transport companies endpoint
app.get('/api/transport/companies', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companiesResult = await executeQuery('SELECT data FROM transport_companies ORDER BY data->>\'name\' ASC', [], pool);
    const companies = companiesResult.rows.map((row: DbRow) => row.data);
    res.json(companies);
  } catch (error) {
    console.error('Failed to fetch transport companies:', error);
    res.status(500).json({ error: 'Failed to fetch transport companies' });
  }
});

// Transport orders endpoint
app.get('/api/transport/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const transportOrdersResult = await executeQuery('SELECT data FROM transport_orders ORDER BY data->>\'createdAt\' DESC', [], pool);
    const transportOrders = transportOrdersResult.rows.map((row: DbRow) => row.data);
    res.json(transportOrders);
  } catch (error) {
    console.error('Failed to fetch transport orders:', error);
    res.status(500).json({ error: 'Failed to fetch transport orders' });
  }
});

// Get all fulfillments
app.get('/api/fulfillments/all', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fulfillmentsResult = await executeQuery('SELECT data FROM fulfillments ORDER BY data->>\'createdAt\' DESC', [], pool);
    const fulfillments = fulfillmentsResult.rows.map((row: DbRow) => row.data);
    res.json(fulfillments);
  } catch (error) {
    console.error('Failed to fetch all fulfillments:', error);
    res.status(500).json({ error: 'Failed to fetch all fulfillments' });
  }
});

// Add endpoint to get fulfillment details
app.get('/api/fulfillments/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    const result = await executeQuery(
      'SELECT data FROM fulfillments WHERE data->>\'orderId\' = $1',
      [orderId],
      pool
    );

    if (result.rows.length === 0) {
      // If no fulfillment exists, create one
      const newFulfillment = {
        id: `FUL${String(Date.now()).slice(-6)}`,
        orderId,
        status: 'pending',
        history: [{
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Fulfillment created'
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await executeQuery(
        'INSERT INTO fulfillments (data) VALUES ($1)',
        [JSON.stringify(newFulfillment)],
        pool
      );

      return res.json(newFulfillment);
    }

    res.json(result.rows[0].data);
  } catch (error) {
    console.error('Failed to fetch fulfillment:', error);
    res.status(500).json({ error: 'Failed to fetch fulfillment' });
  }
});

// Get single order
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    const { userId, isAdmin } = req.query;

    const order = await ensureRecordExists('orders', { field: 'id', value: orderId }, (id) => ({
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      total: 0
    }));

    res.json(order);
  } catch (error) {
    console.error('Failed to fetch order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get single customer
app.get('/api/customers/:customerId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customerId } = req.params;
    const customer = await ensureRecordExists('customers', { field: 'id', value: customerId }, (id) => ({
      id,
      createdAt: new Date().toISOString(),
      status: 'active'
    }));

    res.json(customer);
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Get transport quotes for an order
app.get('/api/transport/quotes/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;

    const quotes = await ensureRecordExists('transport_quotes', { field: 'orderId', value: orderId }, (id) => ({
      id: `QUO-${id}`,
      orderId,
      quotes: [],
      createdAt: new Date().toISOString()
    }));

    res.json(quotes);
  } catch (error) {
    console.error('Failed to fetch transport quotes:', error);
    res.status(500).json({ error: 'Failed to fetch transport quotes' });
  }
});

// ============= Inventory Management =============
// Get warehouse inventory (admin or assigned warehouse only)
app.get('/api/warehouses/:warehouseId/inventory', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { warehouseId } = req.params;
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const employee = employeeResult.rows[0].data;
    if (employee.role !== 'admin' && employee.warehouseId !== warehouseId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const inventoryResult = await executeQuery(
      'SELECT data FROM inventory WHERE data->>\'warehouseId\' = $1',
      [warehouseId],
      pool
    );
    res.json(inventoryResult.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ============= Transport Management =============
// Create transport quote (admin only)
app.post('/api/transport/quotes', isAdmin, async (req, res) => {
  try {
    const { orderId, companyId, price, estimatedDays } = req.body;
    const quote = {
      id: `QUO-${Date.now()}`,
      orderId,
      companyId,
      price,
      estimatedDays,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await executeQuery(
      'INSERT INTO transport_quotes (data) VALUES ($1)',
      [JSON.stringify(quote)],
      pool
    );
    res.json(quote);
  } catch (error) {
    console.error('Failed to create transport quote:', error);
    res.status(500).json({ error: 'Failed to create transport quote' });
  }
});

// ============= Customer Management =============
// Create new customer (admin only)
app.post('/api/customers', isAdmin, async (req, res) => {
  try {
    const customer = {
      id: `CUS${String(Date.now()).slice(-5)}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };

    await executeQuery(
      'INSERT INTO customers (data) VALUES ($1)',
      [JSON.stringify(customer)],
      pool
    );
    res.json(customer);
  } catch (error) {
    console.error('Failed to create customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// ============= Fulfillment Management =============
// Update fulfillment status
app.put('/api/fulfillments/:fulfillmentId/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { fulfillmentId } = req.params;
    const { status } = req.body;

    const fulfillmentResult = await executeQuery(
      'SELECT data FROM fulfillments WHERE data->>\'id\' = $1',
      [fulfillmentId],
      pool
    );

    if (fulfillmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    await executeQuery(
      'UPDATE fulfillments SET data = jsonb_set(data, \'{status}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify(status), fulfillmentId],
      pool
    );

    res.json({ success: true, message: 'Fulfillment status updated' });
  } catch (error) {
    console.error('Failed to update fulfillment status:', error);
    res.status(500).json({ error: 'Failed to update fulfillment status' });
  }
});

// ============= Dashboard Data =============
// Get dashboard stats (role-based)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const employee = employeeResult.rows[0].data;
    let stats;

    if (employee.role === 'admin') {
      // Admin sees all stats
      const [orders, revenue, customers] = await Promise.all([
        executeQuery('SELECT COUNT(*) FROM orders', [], pool),
        executeQuery('SELECT SUM((data->>\'total\')::numeric) FROM orders', [], pool),
        executeQuery('SELECT COUNT(*) FROM customers', [], pool)
      ]);

      stats = {
        totalOrders: parseInt(orders.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].sum || '0'),
        totalCustomers: parseInt(customers.rows[0].count)
      };
    } else {
      // Employees see their assigned orders only
      const orders = await executeQuery(
        'SELECT COUNT(*) FROM orders WHERE data->>\'assignedTo\' = $1',
        [employee.id],
        pool
      );

      stats = {
        assignedOrders: parseInt(orders.rows[0].count),
        completedOrders: 0,
        pendingOrders: 0
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get total stock for a product
app.get('/api/inventory/total-stock/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;

    const stockResult = await executeQuery(
      'SELECT SUM((data->>\'quantity\')::integer) as total FROM inventory WHERE data->>\'productId\' = $1',
      [productId],
      pool
    );

    res.json({ total: parseInt(stockResult.rows[0]?.total || '0') });
  } catch (error) {
    console.error('Failed to fetch total stock:', error);
    res.status(500).json({ error: 'Failed to fetch total stock' });
  }
});

// Check if product needs restocking
app.get('/api/inventory/needs-restock/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;

    // Get product details to check minimum stock level
    const productResult = await executeQuery(
      'SELECT data FROM products WHERE data->>\'id\' = $1',
      [productId],
      pool
    );

    if (productResult.rows.length === 0) {
      return res.json({ needsRestock: false });
    }

    const product = productResult.rows[0].data;
    const minStock = product.minStock || 10; // Default minimum stock level

    // Get current total stock
    const stockResult = await executeQuery(
      'SELECT SUM((data->>\'quantity\')::integer) as total FROM inventory WHERE data->>\'productId\' = $1',
      [productId],
      pool
    );

    const totalStock = parseInt(stockResult.rows[0]?.total || '0');
    res.json({ needsRestock: totalStock < minStock });
  } catch (error) {
    console.error('Failed to check restock status:', error);
    res.status(500).json({ error: 'Failed to check restock status' });
  }
});

// Get warehouse stock for a product
app.get('/api/inventory/warehouse-stock/:productId/:warehouseId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, warehouseId } = req.params;

    const stockResult = await executeQuery(
      'SELECT data FROM inventory WHERE data->>\'productId\' = $1 AND data->>\'warehouseId\' = $2',
      [productId, warehouseId],
      pool
    );

    if (stockResult.rows.length === 0) {
      return res.json({ quantity: 0 });
    }

    res.json({ quantity: parseInt(stockResult.rows[0].data.quantity || '0') });
  } catch (error) {
    console.error('Failed to fetch warehouse stock:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse stock' });
  }
});

// Get products that need restocking
app.get('/api/inventory/restock-needed', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await executeQuery(
      `SELECT 
        p.data as product,
        COALESCE(SUM((i.data->>'quantity')::integer), 0) as total_stock
      FROM products p
      LEFT JOIN inventory i ON i.data->>'productId' = p.data->>'id'
      GROUP BY p.data
      HAVING COALESCE(SUM((i.data->>'quantity')::integer), 0) < COALESCE((p.data->>'minStock')::integer, 10)`,
      [],
      pool
    );

    res.json(result.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch restock needed products:', error);
    res.status(500).json({ error: 'Failed to fetch restock needed products' });
  }
});

// Get single employee
app.get('/api/employees/:employeeId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId } = req.params;
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [employeeId],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Remove sensitive data
    const employee = employeeResult.rows[0].data;
    const { passwordHash, ...safeEmployee } = employee;

    res.json(safeEmployee);
  } catch (error) {
    console.error('Failed to fetch employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Update employee
app.put('/api/employees/:employeeId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId } = req.params;
    const updates = req.body;

    // Check if employee exists
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [employeeId],
      pool
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update employee data
    await executeQuery(
      'UPDATE employees SET data = data || $1::jsonb WHERE data->>\'id\' = $2',
      [JSON.stringify(updates), employeeId],
      pool
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Get employee payment history
app.get('/api/employees/:employeeId/payments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { requesterId, isAdmin } = req.query;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId } = req.params;

    // Security check
    if (employeeId !== requesterId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate sample payment history
    const payments: Payment[] = [];

    res.json(payments);
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Process new payment
app.post('/api/employees/:employeeId/payments', isAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { type, amount, description, reference } = req.body;

    // Create new payment record
    const newPayment: Payment = {
      id: `PAY-${employeeId}-${Date.now()}`,
      employeeId,
      amount,
      description,
      reference,
      currency: 'USD',
      status: 'completed',
      type,
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };

    // Store payment in database
    await executeQuery(
      'INSERT INTO payments (data) VALUES ($1)',
      [JSON.stringify(newPayment)],
      pool
    );

    res.json(newPayment);
  } catch (error) {
    console.error('Failed to process payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Update fulfillment
app.put('/api/fulfillments/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    const updates = req.body;

    // Add history entry
    const historyEntry = {
      status: updates.status || 'updated',
      timestamp: new Date().toISOString(),
      changes: updates,
      userId: token.replace('session-', '')
    };

    const result = await executeQuery(
      `UPDATE fulfillments 
       SET data = jsonb_set(
         jsonb_set(data, '{history}', (data->'history') || $1::jsonb),
         '{updatedAt}',
         $2::jsonb
       )
       WHERE data->>'orderId' = $3
       RETURNING data`,
      [JSON.stringify([historyEntry]), JSON.stringify(new Date().toISOString()), orderId], pool);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    res.json(result.rows[0].data);
  } catch (error) {
    console.error('Failed to update fulfillment:', error);
    res.status(500).json({ error: 'Failed to update fulfillment' });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const productData = {
      id: `PRD-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    // Validate required fields
    const requiredFields = ['name', 'model', 'sku', 'price', 'category'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Insert into database
    await executeQuery(
      'INSERT INTO products (data) VALUES ($1)',
      [JSON.stringify(productData)],
      pool
    );

    // Create initial inventory records with 0 quantity for all warehouses
    const warehousesResult = await executeQuery('SELECT data FROM warehouses', [], pool);
    const warehouses = warehousesResult.rows.map((row: DbRow) => row.data);

    for (const warehouse of warehouses) {
      await executeQuery(
        'INSERT INTO inventory (data) VALUES ($1)',
        [JSON.stringify({
          productId: productData.id,
          warehouseId: warehouse.id,
          quantity: 0,
          lastUpdated: new Date().toISOString()
        })],
        pool
      );
    }

    // Return the created product
    res.status(201).json(productData);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Get product categories
app.get('/api/product-categories', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await executeQuery('SELECT data FROM product_categories', [], pool);
    
    // If no categories exist, create default ones
    if (result.rows.length === 0) {
      const defaultCategories = [
        {
          id: 'CAT-1',
          name: 'Excavators',
          subCategories: ['Mini', 'Medium', 'Large'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'CAT-2',
          name: 'Loaders',
          subCategories: ['Wheel', 'Track', 'Compact'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'CAT-3',
          name: 'Cranes',
          subCategories: ['Mobile', 'Tower', 'Crawler'],
          createdAt: new Date().toISOString()
        }
      ];

      await Promise.all(defaultCategories.map(category =>
        executeQuery(
          'INSERT INTO product_categories (data) VALUES ($1)',
          [JSON.stringify(category)],
          pool
        )
      ));

      return res.json(defaultCategories);
    }

    res.json(result.rows.map((row: DbRow) => row.data));
  } catch (error) {
    console.error('Failed to fetch product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
});

// Add fulfillment payment endpoints
const storage = multer.diskStorage({
  destination: './uploads/receipts',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const router = Router();

router.post('/api/payments/confirm', async (req: RequestWithFile, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fulfillmentId, userId, method, amount, note } = req.body;
    const receipt = req.file?.filename;

    const paymentId = `FPAY-${crypto.randomBytes(8).toString('hex')}`;
    const payment: FulfillmentPayment = {
      id: paymentId,
      fulfillmentId,
      userId,
      amount,
      method,
      status: 'pending',
      receipt: receipt || '',
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await executeQuery(
      'INSERT INTO fulfillment_payments (data) VALUES ($1)',
      [JSON.stringify(payment)],
      pool
    );

    res.json(payment);
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

app.use(router);

// Add this endpoint to handle customer orders
app.get('/api/customers/:customerId/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customerId } = req.params;

    // Get all orders for the customer
    const ordersResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'customerId\' = $1 ORDER BY data->>\'createdAt\' DESC',
      [customerId],
      pool
    );

    const orders = ordersResult.rows.map((row: DbRow) => row.data);
    res.json(orders);
    
  } catch (error) {
    console.error('Failed to fetch customer orders:', error);
    res.status(500).json({ error: 'Failed to fetch customer orders' });
  }
});

// Add endpoint for accepting transport quotes
app.post('/api/orders/:orderId/accept-quote/:quoteId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId, quoteId } = req.params;

    // Check if quote exists
    const quoteResult = await executeQuery(
      'SELECT data FROM transport_quotes WHERE data->>\'id\' = $1 AND data->>\'orderId\' = $2',
      [quoteId, orderId],
      pool
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0].data;

    // Update quote status
    await executeQuery(
      'UPDATE transport_quotes SET data = jsonb_set(data, \'{status}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify('accepted'), quoteId],
      pool
    );

    // Update order with transport details
    await executeQuery(
      'UPDATE orders SET data = jsonb_set(data, \'{transport}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify({ quoteId, ...quote }), orderId],
      pool
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to accept transport quote:', error);
    res.status(500).json({ error: 'Failed to accept transport quote' });
  }
});

// Add this helper function at the top for auto-creation
async function ensureRecordExists(
  table: string,
  identifier: { field: string; value: string },
  createDefault: (id: string) => any
) {
  const result = await executeQuery(
    `SELECT data FROM ${table} WHERE data->>'${identifier.field}' = $1`,
    [identifier.value],
    pool
  );

  if (result.rows.length === 0) {
    const newRecord = createDefault(identifier.value);
    await executeQuery(
      `INSERT INTO ${table} (data) VALUES ($1)`,
      [JSON.stringify(newRecord)],
      pool
    );
    return newRecord;
  }

  return result.rows[0].data;
}

// Update order
app.put('/api/orders/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    const updates = req.body;

    // Check if order exists
    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId],
      pool
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order data
    await executeQuery(
      'UPDATE orders SET data = data || $1::jsonb WHERE data->>\'id\' = $2',
      [JSON.stringify(updates), orderId],
      pool
    );

    // Add history entry
    const historyEntry = {
      action: 'update',
      timestamp: new Date().toISOString(),
      changes: updates,
      userId: token.replace('session-', '')
    };

    await executeQuery(
      'UPDATE orders SET data = jsonb_set(data, \'{history}\', COALESCE(data->\'history\', \'[]\'::jsonb) || $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify([historyEntry]), orderId],
      pool
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const order = {
      id: `ORD${String(Date.now()).slice(-6)}`,
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Order created'
      }]
    };

    await executeQuery(
      'INSERT INTO orders (data) VALUES ($1)',
      [JSON.stringify(order)],
      pool
    );

    // Create initial fulfillment
    const fulfillment = {
      id: `FUL${String(Date.now()).slice(-6)}`,
      orderId: order.id,
      status: 'pending',
      history: [{
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Fulfillment created'
      }],
      trackingNumber: '',
      carrier: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await executeQuery(
      'INSERT INTO fulfillments (data) VALUES ($1)',
      [JSON.stringify(fulfillment)],
      pool
    );

    res.status(201).json(order);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update fulfillment status
app.put('/api/fulfillments/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { orderId } = req.params;
    const updates = req.body;

    const result = await executeQuery(
      'SELECT data FROM fulfillments WHERE data->>\'orderId\' = $1',
      [orderId],
      pool
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    const fulfillment = result.rows[0].data;
    const updatedFulfillment = {
      ...fulfillment,
      ...updates,
      updatedAt: new Date().toISOString(),
      history: [
        ...fulfillment.history,
        {
          status: updates.status || 'updated',
          timestamp: new Date().toISOString(),
          note: updates.notes || 'Fulfillment updated'
        }
      ]
    };

    await executeQuery(
      'UPDATE fulfillments SET data = $1 WHERE data->>\'orderId\' = $2',
      [JSON.stringify(updatedFulfillment), orderId],
      pool
    );

    res.json(updatedFulfillment);
  } catch (error) {
    console.error('Failed to update fulfillment:', error);
    res.status(500).json({ error: 'Failed to update fulfillment' });
  }
});

// ============= Database Initialization =============
app.post('/api/init/employees', async (req, res) => {
  try {
    // Clear existing employees
    await executeQuery('DELETE FROM employees', [], pool);
    
    // Insert initial employees
    for (const employee of employees) {
      await executeQuery(
        'INSERT INTO employees (data) VALUES ($1)',
        [JSON.stringify(employee)],
        pool
      );
    }

    // Clear existing sessions
    await executeQuery('DELETE FROM sessions', [], pool);

    res.json({ message: 'Employee data initialized successfully' });
  } catch (error) {
    console.error('Failed to initialize employee data:', error);
    res.status(500).json({ error: 'Failed to initialize employee data' });
  }
});

// Start the server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();