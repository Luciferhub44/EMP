import pg from 'pg'

const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) 