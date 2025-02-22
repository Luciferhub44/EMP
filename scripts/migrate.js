import { pool } from '../src/lib/db'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

async function migrate() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get list of executed migrations
    const { rows: executed } = await pool.query(
      'SELECT name FROM migrations ORDER BY id'
    )
    const executedMigrations = new Set(executed.map(row => row.name))

    // Read migration files
    const migrationsDir = join(process.cwd(), 'db/migrations')
    const files = await readdir(migrationsDir)
    const pendingMigrations = files
      .filter(f => f.endsWith('.sql'))
      .filter(f => !executedMigrations.has(f))
      .sort()

    // Execute pending migrations
    for (const file of pendingMigrations) {
      console.log(`Executing migration: ${file}`)
      const sql = await readFile(join(migrationsDir, file), 'utf8')
      
      await pool.query('BEGIN')
      try {
        await pool.query(sql)
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        )
        await pool.query('COMMIT')
        console.log(`Migration ${file} completed successfully`)
      } catch (error) {
        await pool.query('ROLLBACK')
        console.error(`Migration ${file} failed:`, error)
        process.exit(1)
      }
    }

    console.log('All migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()