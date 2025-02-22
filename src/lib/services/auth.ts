import { query, queryOne, transaction } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/api/password'
import type { Employee } from '@/types/employee'

interface SignInResponse {
  session: any
  user: Employee
}

export const authService = {
  async signIn(email: string, password: string): Promise<SignInResponse> {
    try {
      // Get user by email
      const user = await queryOne<Employee & { password_hash: string }>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )

      if (!user) {
        throw new Error('Invalid credentials')
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash)
      if (!isValid) {
        throw new Error('Invalid credentials')
      }

      // Create session
      const sessionId = crypto.randomUUID()
      await query(
        `INSERT INTO user_sessions (id, user_id, expires_at)
         VALUES ($1, $2, NOW() + interval '24 hours')`,
        [sessionId, user.id]
      )

      // Log login
      await query(
        `INSERT INTO audit_logs (user_id, action, details)
         VALUES ($1, $2, $3)`,
        [
          user.id,
          'login',
          JSON.stringify({
            timestamp: new Date(),
            success: true
          })
        ]
      )

      const { password_hash, ...userWithoutPassword } = user
      return {
        session: { id: sessionId },
        user: userWithoutPassword
      }
    } catch (error) {
      console.error('Auth error:', error)
      throw error
    }
  },

  async signOut(sessionId: string) {
    try {
      // Get user ID before deleting session
      const session = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_sessions WHERE id = $1',
        [sessionId]
      )

      if (session) {
        // Delete session
        await query(
          'DELETE FROM user_sessions WHERE id = $1',
          [sessionId]
        )

        // Log logout
        await query(
          `INSERT INTO audit_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [
            session.user_id,
            'logout',
            JSON.stringify({
              timestamp: new Date(),
              sessionId
            })
          ]
        )
      }
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  async getCurrentUser(sessionId: string): Promise<Employee | null> {
    try {
      return queryOne<Employee>(
        `SELECT u.* FROM users u
         INNER JOIN user_sessions s ON s.user_id = u.id
         WHERE s.id = $1 AND s.expires_at > NOW()`,
        [sessionId]
      )
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }
}