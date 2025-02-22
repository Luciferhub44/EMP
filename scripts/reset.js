import { pool } from '../src/lib/db.ts'

async function reset() {
  try {
    await pool.query('BEGIN')
    
    // Drop all tables
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `)

    // Run migrations
    const { spawn } = await import('child_process')
    const migrate = spawn('node', ['scripts/migrate.js'], {
      stdio: 'inherit'
    })

    migrate.on('close', async (code) => {
      if (code === 0) {
        // Run seeds
        const seed = spawn('node', ['scripts/seed.js'], {
          stdio: 'inherit'
        })

        seed.on('close', (code) => {
          if (code === 0) {
            console.log('Database reset completed successfully')
          } else {
            console.error('Seeding failed')
            process.exit(1)
          }
        })
      } else {
        console.error('Migration failed')
        process.exit(1)
      }
    })

    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Reset failed:', error)
    process.exit(1)
  }
}

reset()