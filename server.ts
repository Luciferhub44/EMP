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

const DEFAULT_PORT = process.env.PORT || 3001;
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});

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

// Update the login endpoint to use agentId instead of email
app.post('/api/auth/login', async (req, res) => {
  const { agentId, password } = req.body;
  
  try {
    const result = await executeQuery(
      'SELECT data FROM employees WHERE data->>\'agentId\' = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const employee = result.rows[0].data;
    const isValid = await verifyPassword(password, employee.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove sensitive data before sending
    const { passwordHash, ...safeEmployee } = employee;
    res.json({ user: safeEmployee });
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

// Start server function
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);