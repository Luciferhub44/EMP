import pkg from 'pg';
const { Pool } = pkg;

import express from 'express';
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

interface DbRow {
  data: {
    passwordHash?: string;
    [key: string]: any;
  };
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
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

// Helper function for password verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
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

// Update startServer function
async function startServer() {
  try {
    await initializeDatabase();
    const port = await findAvailablePort(DEFAULT_PORT);
    
    await initializeAdminUser();
    app.listen(port, async () => {
      console.log(`Server running on port ${port}`);
      console.log(`Database connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop the entire database schema
    await client.query(`DROP SCHEMA public CASCADE;`);
    await client.query(`CREATE SCHEMA public;`);
    await client.query(`GRANT ALL ON SCHEMA public TO postgres;`);
    await client.query(`GRANT ALL ON SCHEMA public TO public;`);

    // Create tables in correct order
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transport_companies (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transport_orders (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        company_id TEXT NOT NULL REFERENCES transport_companies(id),
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fulfillments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create default admin user from environment variables
    console.log('Creating default admin user...');
    const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);
    const adminUser = {
      id: ADMIN_ID,
      agentId: 'ADMIN001',
      name: 'Admin HQ',
      email: ADMIN_EMAIL,
      role: 'admin',
      status: 'active',
      assignedOrders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: adminPasswordHash,
      businessInfo: {
        companyName: 'Sany Global',
        registrationNumber: 'REG123',
        taxId: 'TAX123',
        businessAddress: {
          street: '123 Admin St',
          city: 'Admin City',
          state: 'AS',
          postalCode: '12345',
          country: 'USA'
        }
      },
      payrollInfo: {
        bankName: 'Sany Global',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        paymentFrequency: 'monthly',
        baseRate: 5000,
        currency: 'USD',
        lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    await client.query(
      `INSERT INTO employees (id, email, role, data) VALUES ($1, $2, $3, $4)`,
      [adminUser.id, adminUser.email, adminUser.role, adminUser]
    );
    console.log('Default admin user created');

    // Insert other data in correct order
    console.log('Inserting warehouses...');
    for (const warehouse of warehouses) {
      await client.query(
        `INSERT INTO warehouses (id, data) VALUES ($1, $2)`,
        [warehouse.id, warehouse]
      );
    }

    console.log('Inserting products...');
    for (const product of products) {
      await client.query(
        `INSERT INTO products (id, sku, status, data) VALUES ($1, $2, $3, $4)`,
        [product.id, product.sku, product.status, product]
      );
    }

    // Skip the admin user when inserting employees from data file
    console.log('Inserting additional employees...');
    for (const employee of employees) {
      if (employee.email !== ADMIN_EMAIL) {  // Skip the admin user
        try {
          console.log('Attempting to insert employee:', employee.id);
          await client.query(
            `INSERT INTO employees (id, email, role, data) VALUES ($1, $2, $3, $4)`,
            [employee.id, employee.email, employee.role, employee]
          );
          console.log('Successfully inserted employee:', employee.id);
        } catch (error) {
          console.error('Failed to insert employee:', employee.id, error);
          throw error;
        }
      } else {
        console.log('Skipping duplicate admin user in employees data');
      }
    }

    console.log('Inserting customers...');
    for (const customer of customers) {
      await client.query(
        `INSERT INTO customers (id, email, data) VALUES ($1, $2, $3)`,
        [customer.id, customer.email, customer]
      );
    }

    console.log('Inserting transport companies...');
    for (const company of transportCompanies) {
      await client.query(
        `INSERT INTO transport_companies (id, data) VALUES ($1, $2)`,
        [company.id, company]
      );
    }

    console.log('Inserting orders...');
    for (const order of orders) {
      console.log('Inserting order:', order.id, order);
      await client.query(
        `INSERT INTO orders (id, customer_id, status, data) VALUES ($1, $2, $3, $4)`,
        [order.id, order.customerId, order.status, order]
      );
    }

    // Get list of valid order IDs
    const orderCheck = await client.query('SELECT id FROM orders');
    const validOrderIds = orderCheck.rows.map(row => row.id);
    console.log('Valid order IDs:', validOrderIds);

    // Only insert fulfillments for valid orders
    console.log('Inserting fulfillments...');
    for (const [id, fulfillment] of Object.entries(fulfillments)) {
      if (validOrderIds.includes(fulfillment.orderId)) {
        await client.query(
          `INSERT INTO fulfillments (id, order_id, status, data) VALUES ($1, $2, $3, $4)`,
          [id, fulfillment.orderId, fulfillment.status, fulfillment]
        );
      } else {
        console.log(`Skipping fulfillment ${id} - order ${fulfillment.orderId} does not exist`);
      }
    }

    console.log('Inserting transport orders...');
    for (const transportOrder of transportOrders) {
      await client.query(
        `INSERT INTO transport_orders (id, order_id, company_id, status, data) VALUES ($1, $2, $3, $4, $5)`,
        [transportOrder.id, transportOrder.orderId, transportOrder.companyId, transportOrder.status, transportOrder]
      );
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Wrapper function for database queries with error handling
async function executeQuery(queryText: string, params: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// API routes
app.post('/api/db/query', async (req, res) => {
  const { text, params } = req.body;
  console.log('Received query:', { text, params });

  try {
    const result = await executeQuery(text, params);
    console.log('Query success:', result.rows.length, 'rows');
    res.json(result);
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
    const result = await executeQuery('SELECT * FROM employees', []);
    console.log('Current employees:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Initialize admin user if not exists
async function initializeAdminUser() {
  try {
    const adminResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      ['ADMIN001']
    );

    if (adminResult.rows.length === 0) {
      const adminUser = {
        id: 'ADMIN001',
        name: 'Admin HQ',
        email: 'hq@sanyglobal.org',
        role: 'admin',
        status: 'active',
        passwordHash: await bcrypt.hash('admin123', 10), // Change in production!
        createdAt: new Date().toISOString(),
        settings: defaultSettings
      };

      await executeQuery(
        'INSERT INTO employees (data) VALUES ($1)',
        [JSON.stringify(adminUser)]
      );
      console.log('Admin user initialized');
    }
  } catch (error) {
    console.error('Failed to initialize admin user:', error);
  }
}

// Update the login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { agentId, password } = req.body;
    console.log('Login attempt:', { agentId });

    const result = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const employee = result.rows[0].data;
    
    // For the admin user with plain password
    if (agentId === 'ADMIN001' && password === 'admin123') {
      const { passwordHash, ...safeEmployee } = employee;
      return res.json({ 
        user: safeEmployee,
        token: `session-${safeEmployee.id}`
      });
    }

    // For other users, use bcrypt
    const isValidPassword = await bcrypt.compare(password, employee.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { passwordHash, ...safeEmployee } = employee;
    res.json({ 
      user: safeEmployee,
      token: `session-${safeEmployee.id}`
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

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
      `INSERT INTO employees (id, email, role, data) VALUES ($1, $2, $3, $4)`,
      [newEmployee.id, newEmployee.email, newEmployee.role, newEmployee]
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
      [userId]
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
      [userId]
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
      [JSON.stringify(newSettings), userId]
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
      [token.replace('session-', '')]
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
    const ordersResult = await executeQuery(query, params);
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
      [token.replace('session-', '')]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get customers from database
    const customersResult = await executeQuery('SELECT data FROM customers ORDER BY data->>\'createdAt\' DESC', []);
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

    const productsResult = await executeQuery('SELECT data FROM products ORDER BY data->>\'createdAt\' DESC', []);
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
      executeQuery('SELECT COUNT(*) FROM orders', []),
      executeQuery('SELECT COUNT(*) FROM products', []),
      executeQuery('SELECT COUNT(*) FROM customers', [])
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
      [token.replace('session-', '')]
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
app.post('/api/employees/:employeeId/assign-order', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { employeeId } = req.params;
    const { orderId } = req.body;

    // Check if requester is admin or the employee themselves
    const requesterResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [token.replace('session-', '')]
    );

    if (requesterResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const requester = requesterResult.rows[0].data;
    if (requester.role !== 'admin' && requester.id !== employeeId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Verify employee exists
    const employeeResult = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'id\' = $1',
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Verify order exists and is unassigned
    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0].data;
    if (order.assignedTo) {
      return res.status(400).json({ error: 'Order already assigned' });
    }

    // Update order assignment
    await executeQuery(
      'UPDATE orders SET data = jsonb_set(data, \'{assignedTo}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify(employeeId), orderId]
    );

    // Create notification for the employee
    await executeQuery(
      'INSERT INTO notifications (data) VALUES ($1)',
      [JSON.stringify({
        id: `not-${Date.now()}`,
        userId: employeeId,
        type: 'ORDER_ASSIGNED',
        message: `Order ${orderId} has been assigned to you`,
        timestamp: new Date().toISOString(),
        isRead: false
      })]
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
      []
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
      [token.replace('session-', '')]
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
      [JSON.stringify(updates), employeeId]
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
      ['pending']
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

    const fulfillmentsResult = await executeQuery('SELECT data FROM fulfillments ORDER BY data->>\'createdAt\' DESC', []);
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

    const companiesResult = await executeQuery('SELECT data FROM transport_companies ORDER BY data->>\'name\' ASC', []);
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

    const transportOrdersResult = await executeQuery('SELECT data FROM transport_orders ORDER BY data->>\'createdAt\' DESC', []);
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

    const fulfillmentsResult = await executeQuery('SELECT data FROM fulfillments ORDER BY data->>\'createdAt\' DESC', []);
    const fulfillments = fulfillmentsResult.rows.map((row: DbRow) => row.data);
    res.json(fulfillments);
  } catch (error) {
    console.error('Failed to fetch all fulfillments:', error);
    res.status(500).json({ error: 'Failed to fetch all fulfillments' });
  }
});

// Get fulfillment by order ID
app.get('/api/fulfillments/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;

    // First check if order exists
    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Then get fulfillment
    const fulfillmentResult = await executeQuery(
      'SELECT data FROM fulfillments WHERE data->>\'orderId\' = $1',
      [orderId]
    );

    // If no fulfillment exists yet, return a default structure
    if (fulfillmentResult.rows.length === 0) {
      return res.json({
        id: `FUL-${orderId}`,
        orderId: orderId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: orderResult.rows[0].data.items || []
      });
    }

    res.json(fulfillmentResult.rows[0].data);
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

    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(orderResult.rows[0].data);
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
    const customerResult = await executeQuery(
      'SELECT data FROM customers WHERE data->>\'id\' = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customerResult.rows[0].data);
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Get transport quotes for order
app.get('/api/transport/quotes/:orderId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.params;
    
    // Get order details first
    const orderResult = await executeQuery(
      'SELECT data FROM orders WHERE data->>\'id\' = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get quotes for this order
    const quotesResult = await executeQuery(
      'SELECT data FROM transport_quotes WHERE data->>\'orderId\' = $1 ORDER BY (data->>\'price\')::numeric ASC',
      [orderId]
    );

    res.json(quotesResult.rows.map((row: DbRow) => row.data));
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
      [token.replace('session-', '')]
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
      [warehouseId]
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
      [JSON.stringify(quote)]
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
      [JSON.stringify(customer)]
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
      [fulfillmentId]
    );

    if (fulfillmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    await executeQuery(
      'UPDATE fulfillments SET data = jsonb_set(data, \'{status}\', $1::jsonb) WHERE data->>\'id\' = $2',
      [JSON.stringify(status), fulfillmentId]
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
      [token.replace('session-', '')]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const employee = employeeResult.rows[0].data;
    let stats;

    if (employee.role === 'admin') {
      // Admin sees all stats
      const [orders, revenue, customers] = await Promise.all([
        executeQuery('SELECT COUNT(*) FROM orders', []),
        executeQuery('SELECT SUM((data->>\'total\')::numeric) FROM orders', []),
        executeQuery('SELECT COUNT(*) FROM customers', [])
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
        [employee.id]
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

// Start the server
startServer().catch(console.error);