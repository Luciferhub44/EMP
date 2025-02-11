import pkg from 'pg';
const { Pool } = pkg;

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Database initialization
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables
    await client.query(`
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
    `);

    // Insert test data if tables are empty
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
  } finally {
    client.release();
  }
}

// Initialize database on startup
initializeDatabase();

// API routes
app.get('/api/db/test', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
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
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
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
    } finally {
      client.release();
    }
  } catch (err) {
    const error = err as Error;
    console.error('Connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});