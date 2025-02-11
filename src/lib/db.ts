import { Pool } from 'pg'

// Create a new Pool instance
export const db = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
})

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create storage table for general key-value storage
    await db.query(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create tables for main data types
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        customer_id TEXT,
        status TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        sku TEXT UNIQUE,
        status TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better query performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)')

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Helper function to handle database errors
export function handleDbError(error: any) {
  console.error('Database error:', error)
  throw new Error('Database operation failed')
}

// Export a function to get the database connection
export async function getDb() {
  try {
    const client = await db.connect()
    return client
  } catch (error) {
    console.error('Error connecting to database:', error)
    throw error
  }
}

// Initialize the database when the application starts
initializeDatabase().catch(console.error)
