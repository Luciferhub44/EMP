import type { Pool, PoolClient } from 'pg'
import pg from 'pg'

const isDevelopment = process.env.NODE_ENV !== 'production'

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isDevelopment ? false : {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  application_name: 'emp_app'
}

export const pool = new pg.Pool(connectionConfig) as pg.Pool & { on: Function }

pool.on('error', (err: Error) => {
  console.error('Database pool error:', err)
})

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

// Simplified health check
export const testConnection = async () => {
  try {
    await query('SELECT 1')
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}