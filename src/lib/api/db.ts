import { Pool } from 'pg'
import { warehouses } from "@/data/warehouses"
import { products } from "@/data/products"
import { employees } from "@/data/employees"
import { customers } from "@/data/customers"
import { productCategories } from "@/data/products"

// Create connection pool
export const db = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some hosted PostgreSQL services
  }
})

// Initialize database with sample data
export async function initializeSampleData() {
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
  try {
    const client = await db.connect()
    console.log('Database connected successfully')
    
    // Test query
    const result = await client.query('SELECT NOW()')
    console.log('Database query successful:', result.rows[0])
    
    await initializeSampleData()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Helper for queries
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const res = await db.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Query error:', error)
    throw error
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
