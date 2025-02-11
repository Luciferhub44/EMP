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
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
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
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      console.error('Query error:', error);
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