import type { Pool, PoolClient } from 'pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Simple query function
export async function query<T extends Record<string, any>>(text: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(text, params)
    return result.rows
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
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}