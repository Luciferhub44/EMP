import { Pool } from 'pg'
import { warehouses } from "@/data/warehouses"
import { products } from "@/data/products"
import { employees } from "@/data/employees"
import { customers } from "@/data/customers"
import { productCategories } from "@/data/products"

// Create a new Pool instance
export const db = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
})

// Initialize database with sample data
async function initializeSampleData() {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Insert warehouses
    for (const warehouse of warehouses) {
      await client.query(
        'INSERT INTO storage (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        [`warehouse:${warehouse.id}`, warehouse]
      )
    }

    // Insert product categories
    await client.query(
        'INSERT INTO storage (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        ['product_categories', productCategories]
    )

    // Insert products
    for (const product of products) {
      await client.query(
        'INSERT INTO products (id, data, sku, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = $2, sku = $3, status = $4',
        [product.id, product, product.sku, product.status]
      )
    }

    // Insert employees
    for (const employee of employees) {
      await client.query(
        'INSERT INTO employees (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
        [employee.id, employee]
      )
    }

    // Insert customers
    for (const customer of customers) {
      await client.query(
        'INSERT INTO customers (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
        [customer.id, customer]
      )
    }

    await client.query('COMMIT')
    console.log('Sample data initialized successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error initializing sample data:', error)
    throw error
  } finally {
    client.release()
  }
}

// Initialize database tables
export async function initializeDatabase() {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Create storage table for general key-value storage
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create main data tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        customer_id TEXT,
        status TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        sku TEXT UNIQUE,
        status TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create shipping and transport tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipping_routes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_quotes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS fulfillments (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        order_id TEXT,
        status TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create chat and messaging tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_users (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create websocket tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS websocket_status (
        id SERIAL PRIMARY KEY,
        status BOOLEAN NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS websocket_messages (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better query performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_shipping_routes_postal ON shipping_routes((data->\'originPostal\'), (data->\'destPostal\'))')
    await client.query('CREATE INDEX IF NOT EXISTS idx_transport_quotes_data_orderid ON transport_quotes((data->\'orderId\'))')

    await client.query('COMMIT')
    console.log('Database schema initialized successfully')

    // Initialize sample data after schema is created
    await initializeSampleData()
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error initializing database:', error)
    throw error
  } finally {
    client.release()
  }
}

// Helper function to handle database errors
export function handleDbError(error: any) {
  console.error('Database error:', error)
  throw new Error('Database operation failed')
}

// Get a database client with error handling
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
