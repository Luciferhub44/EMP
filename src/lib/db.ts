import type { Pool, PoolClient } from 'pg'
import pg from 'pg'

const connectionString = import.meta.env.DATABASE_URL || import.meta.env.VITE_DATABASE_URL

export const pool = new pg.Pool({
  connectionString,
  ssl: import.meta.env.VITE_NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Simple query function that uses fetch API instead of pg
export async function query<T>(text: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

// Query for single row
export async function queryOne<T>(text: string, params: any[] = []): Promise<T | null> {
  const result = await query<T>(text, params)
  return result[0] || null
}

// Transaction helper
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT NOW()')
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}