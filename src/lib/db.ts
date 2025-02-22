import type { Pool, PoolClient } from 'pg'
import pg from 'pg'

const isDevelopment = process.env.NODE_ENV !== 'production'

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isDevelopment ? false : {
    rejectUnauthorized: false
  },
  // Add connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

export const pool = new pg.Pool(connectionConfig) as pg.Pool & { on: Function }

// Add connection error handling
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Simple query function
export async function query<T extends Record<string, any>>(text: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

// Query for single row
export async function queryOne<T extends Record<string, any>>(text: string, params: any[] = []): Promise<T | null> {
  const result = await query<T>(text, params)
  return result[0] || null
}

// Transaction helper
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('Database connection successful:', result.rows[0])
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}