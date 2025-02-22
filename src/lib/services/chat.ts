import { query, queryOne, transaction } from '@/lib/db'
import { BaseService } from './base'
import type { ChatMessage, ChatSession } from '@/types/chat'

export class ChatService extends BaseService {
  async createSession(userId: string): Promise<ChatSession> {
    const result = await this.queryOne<ChatSession>(`
      INSERT INTO chat_sessions (user_id)
      VALUES ($1)
      RETURNING *
    `, [userId])

    if (!result) {
      throw new Error('Failed to create chat session')
    }

    return result
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    const result = await this.queryOne<ChatSession>(`
      SELECT * FROM chat_sessions
      WHERE id = $1
    `, [sessionId])

    if (!result) {
      throw new Error('Chat session not found')
    }

    return result
  }

  async addMessage(sessionId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    const result = await this.queryOne<ChatMessage>(`
      INSERT INTO chat_messages (
        session_id,
        content,
        role,
        metadata
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      sessionId,
      message.content,
      message.role,
      message.metadata || {}
    ])

    if (!result) {
      throw new Error('Failed to add message')
    }

    return result
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const result = await this.query<ChatMessage>(`
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId])

    return result || []
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const result = await this.queryOne<ChatSession>(`
      UPDATE chat_sessions
      SET
        metadata = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [sessionId, { ...session.metadata, ...updates }])

    if (!result) {
      throw new Error('Failed to update session')
    }

    return result
  }
}

export const chatService = new ChatService()