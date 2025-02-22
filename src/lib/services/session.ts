import { pool, query, queryOne } from '@/lib/db'
import type { Session, SessionMetadata, ActiveSession } from "@/types/session"

export class SessionService {
  async createSession(
    userId: string,
    metadata: SessionMetadata
  ): Promise<Session> {
    const session = await queryOne<Session>(
      `INSERT INTO user_sessions (
        user_id,
        token,
        ip_address,
        user_agent,
        metadata
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        userId,
        crypto.randomUUID(),
        metadata.location?.ip,
        metadata.userAgent,
        JSON.stringify(metadata)
      ]
    )
    
    if (!session) {
      throw new Error('Failed to create session')
    }
    
    return session
  }

  async getSession(id: string): Promise<Session | null> {
    const session = await query<Session>('SELECT * FROM sessions WHERE id = $1', [id])
    return session[0] || null
  }

  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    return query<ActiveSession>(
      `SELECT 
        s.*,
        s.metadata::jsonb as metadata,
        s.token = $2 as current_device
       FROM user_sessions s
       WHERE s.user_id = $1
       AND s.expires_at > NOW()
       ORDER BY s.created_at DESC`,
      [userId, localStorage.getItem('sessionId')]
    )
  }

  async deleteSession(token: string): Promise<void> {
    await pool.query(
      'DELETE FROM user_sessions WHERE token = $1',
      [token]
    )
  }

  async deleteAllUserSessions(userId: string, exceptToken?: string): Promise<void> {
    const sql = `
      DELETE FROM user_sessions 
      WHERE user_id = $1
      ${exceptToken ? 'AND token != $2' : ''}`
    
    const params = exceptToken ? [userId, exceptToken] : [userId]
    await pool.query(sql, params)
  }

  async extendSession(token: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions 
       SET expires_at = NOW() + interval '24 hours'
       WHERE token = $1`,
      [token]
    )
  }

  async updateSessionMetadata(
    token: string,
    metadata: Partial<SessionMetadata>
  ): Promise<void> {
    await pool.query(
      `UPDATE user_sessions
       SET metadata = metadata::jsonb || $2::jsonb
       WHERE token = $1`,
      [token, JSON.stringify(metadata)]
    )
  }

  async cleanupExpiredSessions(): Promise<void> {
    await pool.query(
      'DELETE FROM user_sessions WHERE expires_at <= NOW()'
    )
  }
}

export const sessionService = new SessionService()