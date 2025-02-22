// Database connection configuration
export const config = {
  user: import.meta.env.VITE_DB_USER,
  password: import.meta.env.VITE_DB_PASSWORD,
  host: import.meta.env.VITE_DB_HOST,
  port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
  database: import.meta.env.VITE_DB_NAME,
  ssl: import.meta.env.VITE_DB_SSL === 'true'
}

// Simple query function that uses fetch API instead of pg
export async function query<T>(text: string, params: any[] = []): Promise<T[]> {
  const response = await fetch('/api/db/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
    },
    body: JSON.stringify({ text, params })
  })

  if (!response.ok) {
    throw new Error('Database query failed')
  }

  return response.json()
}

// Query for single row
export async function queryOne<T>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

// Transaction helper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const response = await fetch('/api/db/transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
    },
    body: JSON.stringify({ operations: callback.toString() })
  })

  if (!response.ok) {
    throw new Error('Transaction failed')
  }

  return response.json()
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

// Export config for server-side use
export { pool } from './db/pool'