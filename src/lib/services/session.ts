import { db } from "@/lib/db"
import type { Session } from "@/types/session"

export const sessionService = {
  createSession: async (userId: string, token: string): Promise<Session> => {
    const session: Session = {
      id: `SES${Date.now()}`,
      userId,
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    await db.query(
      'INSERT INTO storage (key, data) VALUES ($1, $2)',
      [`session:${token}`, session]
    )

    return session
  },

  getSession: async (token: string): Promise<Session | null> => {
    const result = await db.query(
      'SELECT data FROM storage WHERE key = $1',
      [`session:${token}`]
    )

    const session = result.rows[0]?.data
    if (!session) return null

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await sessionService.deleteSession(token)
      return null
    }

    return session
  },

  deleteSession: async (token: string): Promise<void> => {
    await db.query(
      'DELETE FROM storage WHERE key = $1',
      [`session:${token}`]
    )
  },

  deleteAllUserSessions: async (userId: string): Promise<void> => {
    const result = await db.query(
      'SELECT key, data FROM storage WHERE key LIKE \'session:%\''
    )

    const sessionKeys = result.rows
      .filter(row => row.data.userId === userId)
      .map(row => row.key)

    if (sessionKeys.length > 0) {
      await db.query(
        'DELETE FROM storage WHERE key = ANY($1)',
        [sessionKeys]
      )
    }
  }
} 