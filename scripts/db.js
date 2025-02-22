import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDevelopment = process.env.NODE_ENV !== 'production'
const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

export const pool = new pg.Pool({
  connectionString,
  ssl: isDevelopment ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Simple query function
export async function query(text, params = []) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Query for single row
export async function queryOne(text, params = []) {
  const result = await query(text, params)
  return result[0] || null
}

// Health check endpoint
export async function healthCheck() {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

// Initialize database
export async function initializeDb() {
  try {
    // Create extensions if they don't exist
    await query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `)

    // Create health check endpoint
    await query(`
      CREATE OR REPLACE FUNCTION health_check()
      RETURNS boolean AS $$
      BEGIN
        RETURN true;
      END;
      $$ LANGUAGE plpgsql;
    `)

    console.log('Database initialized successfully')
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// Export for use in other files
export default {
  pool,
  query,
  queryOne,
  healthCheck,
  initializeDb
} 