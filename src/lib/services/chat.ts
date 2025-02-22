import { pool, query, queryOne, transaction } from '@/lib/db'
import type { ChatMessage, ChatUser } from "@/types/chat"

class ChatService {
  private currentUser: ChatUser | null = null
  private messageCallbacks: ((message: ChatMessage) => void)[] = []
  private userStatusCallbacks: ((user: ChatUser) => void)[] = []

  constructor() {
    this.initializeCurrentUser()
  }

  private async initializeCurrentUser() {
    try {
      const sessionId = localStorage.getItem('sessionId')
      if (!sessionId) return

      const userData = await queryOne<ChatUser>(
        `SELECT id, name, role, last_seen
         FROM users 
         WHERE id = (
           SELECT user_id 
           FROM user_sessions 
           WHERE id = $1 AND expires_at > NOW()
         )`,
        [sessionId]
      )

      if (userData) {
        this.currentUser = {
          ...userData,
          isOnline: true
        }

        // Update user's online status
        await pool.query(
          `UPDATE users 
           SET last_seen = NOW()
           WHERE id = $1`,
          [userData.id]
        )
      }
    } catch (error) {
      console.error('Failed to initialize chat user:', error)
    }
  }

  async sendMessage(content: string, attachments?: File[]): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error('User not initialized')
    }

    return transaction(async (client) => {
      // Create message
      const messageResult = await client.query(
        `INSERT INTO messages (
          sender_id,
          content,
          attachments
        ) VALUES ($1, $2, $3)
        RETURNING *`,
        [
          this.currentUser.id,
          content,
          attachments ? JSON.stringify(attachments) : null
        ]
      )

      const message = messageResult.rows[0]

      // Create notifications for other online users
      await client.query(
        `INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        SELECT 
          id,
          'chat',
          $1,
          $2,
          jsonb_build_object(
            'messageId', $3,
            'senderId', $4
          )
        FROM users
        WHERE id != $4
        AND last_seen > NOW() - interval '5 minutes'`,
        [
          `New message from ${this.currentUser.name}`,
          content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          message.id,
          this.currentUser.id
        ]
      )

      return {
        id: message.id,
        userId: message.sender_id,
        userName: this.currentUser.name,
        userRole: this.currentUser.role,
        content: message.content,
        timestamp: message.created_at,
        attachments: message.attachments
      }
    })
  }

  async getMessages(limit = 50, before?: string): Promise<ChatMessage[]> {
    const sql = `
      SELECT m.*, u.name as user_name, u.role as user_role
      FROM messages m
      INNER JOIN users u ON u.id = m.sender_id
      ${before ? 'WHERE m.created_at < $2' : ''}
      ORDER BY m.created_at DESC
      LIMIT $1
    `
    const params = before ? [limit, before] : [limit]
    
    const messages = await query<ChatMessage>(sql, params)
    return messages.reverse()
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.currentUser) return

    await pool.query(
      `UPDATE message_reads
       SET read_at = NOW()
       WHERE message_id = $1 AND user_id = $2`,
      [messageId, this.currentUser.id]
    )
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback)
  }

  onUserStatusChange(callback: (user: ChatUser) => void) {
    this.userStatusCallbacks.push(callback)
  }

  async updateUserStatus(isOnline: boolean): Promise<void> {
    if (!this.currentUser) return

    await pool.query(
      `UPDATE users
       SET last_seen = $1
       WHERE id = $2`,
      [isOnline ? new Date() : null, this.currentUser.id]
    )

    this.userStatusCallbacks.forEach(callback => 
      callback({
        ...this.currentUser!,
        isOnline
      })
    )
  }

  async getOnlineUsers(): Promise<ChatUser[]> {
    return query<ChatUser>(
      `SELECT id, name, role, last_seen,
        last_seen > NOW() - interval '5 minutes' as is_online
       FROM users
       WHERE last_seen > NOW() - interval '30 minutes'
       ORDER BY name`
    )
  }

  getCurrentUser(): ChatUser | null {
    return this.currentUser
  }

  async cleanup(): Promise<void> {
    // Clear old messages and update user statuses
    await transaction(async (client) => {
      // Archive old messages
      await client.query(
        `INSERT INTO message_archive (message_id, content, sender_id, created_at)
         SELECT id, content, sender_id, created_at
         FROM messages
         WHERE created_at < NOW() - interval '30 days'`
      )

      // Delete archived messages
      await client.query(
        `DELETE FROM messages
         WHERE created_at < NOW() - interval '30 days'`
      )

      // Update offline users
      await client.query(
        `UPDATE users
         SET last_seen = NULL
         WHERE last_seen < NOW() - interval '30 minutes'`
      )
    })
  }
}

export const chatService = new ChatService()