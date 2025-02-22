import { pool } from '../src/lib/db.ts'
import { hashPassword } from '../src/lib/api/password.ts'

async function seed() {
  try {
    // Create admin user
    const hashedPassword = await hashPassword('admin123')
    await pool.query(`
      INSERT INTO users (
        email,
        name,
        role,
        status,
        agent_id,
        password_hash,
        business_info,
        payroll_info
      ) VALUES (
        'admin@example.com',
        'System Admin',
        'admin',
        'active',
        'ADMIN001',
        $1,
        '{"companyName":"SANY Equipment","registrationNumber":"93-1671162","taxId":"93-1671162","businessAddress":{"street":"228 Park Ave S","city":"New York","state":"NY","postalCode":"10003","country":"USA"}}',
        '{"bankName":"Bank of America","accountNumber":"483101090345","routingNumber":"21000322","paymentFrequency":"monthly","baseRate":5000,"currency":"USD","commissionRate":2.5}'
      ) ON CONFLICT (email) DO NOTHING
    `, [hashedPassword])

    console.log('Seed data inserted successfully')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()