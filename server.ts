import pkg from 'pg';
const { Pool } = pkg;

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables with indexes
    await client.query(`
      -- Create tables if they don't exist
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        status TEXT,
        data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transport_quotes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      
      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_employees_data ON employees USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_products_data ON products USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_orders_data ON orders USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_customers_data ON customers USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_data ON transport_quotes USING gin (data);
    `);

    // Insert test data
    const testData = {
      employees: [{
        id: 'admin1',
        data: {
          id: 'admin1',
          agentId: 'admin',
          passwordHash: 'admin123',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          assignedOrders: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      customers: [{
        id: 'CUST-1',
        data: {
          id: 'CUST-1',
          name: 'Test Customer',
          email: 'customer@example.com',
          phone: '1234567890',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      products: [{
        id: 'PROD-1',
        data: {
          id: 'PROD-1',
          name: 'Test Product',
          description: 'A test product',
          price: 99.99,
          inventory: [{
            warehouseId: 'WH-1',
            quantity: 100,
            minimumStock: 10
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      orders: [{
        id: 'ORD-1',
        customer_id: 'CUST-1',
        status: 'pending',
        data: {
          id: 'ORD-1',
          customerId: 'CUST-1',
          items: [{
            productId: 'PROD-1',
            quantity: 1,
            price: 99.99
          }],
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      transport_quotes: [{
        id: 'TQ-1',
        data: {
          id: 'TQ-1',
          orderId: 'ORD-1',
          provider: 'Test Shipping',
          price: 10.00,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }]
    };

    // Insert test data if not exists
    for (const [table, items] of Object.entries(testData)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO ${table} (id, data) 
           VALUES ($1, $2) 
           ON CONFLICT (id) DO NOTHING`,
          [item.id, item.data]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Database initialized with test data');
  } catch (err) {
    await client.query('ROLLBACK');
    const error = err as Error;
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Wrapper function for database queries with error handling
async function executeQuery(queryText: string, params?: any[]) {
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
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await executeQuery('SELECT NOW()');
    res.json({ success: true, timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/api/db/query', async (req, res) => {
  const { text, params } = req.body;
  console.log('Received query:', { text, params });

  try {
    const result = await executeQuery(text, params);
    console.log('Query success:', result.rows.length, 'rows');
    res.json(result);
  } catch (err) {
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

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server function
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connected: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);