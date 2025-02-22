import { query, queryOne, transaction } from '@/lib/db'
import type { Message, ChatThread, Department } from '@/types/messages'

class MessagesService {
  async getThreads(userId: string, isAdmin: boolean) {
    const sql = `
      SELECT t.*,
        (
          SELECT row_to_json(last_msg)
          FROM (
            SELECT m.*, u.name as sender_name
            FROM messages m
            INNER JOIN users u ON u.id = m.sender_id
            WHERE m.thread_id = t.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) last_msg
        ) as last_message
      FROM message_threads t
      INNER JOIN message_participants p ON p.thread_id = t.id
      WHERE p.user_id = $1 OR $2 = true
      ORDER BY t.updated_at DESC
    `
    return query<ChatThread>(sql, [userId, isAdmin])
  }

  async getThread(threadId: string, userId: string, isAdmin: boolean) {
    const sql = `
      SELECT t.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'role', u.role
            )
          )
          FROM message_participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.thread_id = t.id
        ) as participants
      FROM message_threads t
      WHERE t.id = $1
      AND (
        EXISTS (
          SELECT 1 FROM message_participants
          WHERE thread_id = t.id AND user_id = $2
        )
        OR $3 = true
      )
    `
    return queryOne<ChatThread>(sql, [threadId, userId, isAdmin])
  }

  async getMessages(threadId: string, userId: string, isAdmin: boolean) {
    const sql = `
      SELECT m.*,
        u.name as sender_name,
        u.role as sender_role
      FROM messages m
      INNER JOIN users u ON u.id = m.sender_id
      WHERE m.thread_id = $1
      AND (
        EXISTS (
          SELECT 1 FROM message_participants
          WHERE thread_id = m.thread_id AND user_id = $2
        )
        OR $3 = true
      )
      ORDER BY m.created_at ASC
    `
    return query<Message>(sql, [threadId, userId, isAdmin])
  }

  async startThread(
    employeeId: string,
    department: Department,
    initialMessage: string
  ): Promise<ChatThread> {
    return transaction(async (client) => {
      // Create thread
      const threadResult = await client.query<ChatThread>(
        `INSERT INTO message_threads (department, subject)
         VALUES ($1, $2)
         RETURNING *`,
        [department, `${department} Support Request`]
      )
      const thread = threadResult.rows[0]

      // Add employee as participant
      await client.query(
        `INSERT INTO message_participants (thread_id, user_id, role)
         VALUES ($1, $2, 'creator')`,
        [thread.id, employeeId]
      )

      // Add department admins as participants
      await client.query(
        `INSERT INTO message_participants (thread_id, user_id, role)
         SELECT $1, id, 'admin'
         FROM users
         WHERE role = 'admin'`,
        [thread.id]
      )

      // Add initial message
      const messageResult = await client.query<Message>(
        `INSERT INTO messages (thread_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [thread.id, employeeId, initialMessage]
      )

      return {
        ...thread,
        lastMessage: messageResult.rows[0]
      }
    })
  }

  async sendMessage(
    threadId: string,
    content: string,
    userId: string,
    isAdmin: boolean
  ): Promise<Message> {
    return transaction(async (client) => {
      // Verify user is participant
      const canAccess = await client.query(
        `SELECT 1 FROM message_participants
         WHERE thread_id = $1
         AND (user_id = $2 OR $3 = true)`,
        [threadId, userId, isAdmin]
      )

      if (canAccess.rowCount === 0) {
        throw new Error('Access denied')
      }

      // Send message
      const result = await client.query<Message>(
        `INSERT INTO messages (thread_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [threadId, userId, content]
      )

      // Update thread
      await client.query(
        `UPDATE message_threads
         SET updated_at = NOW()
         WHERE id = $1`,
        [threadId]
      )

      // Create notifications
      await client.query(
        `INSERT INTO notifications (
           user_id, type, title, message, action_url, metadata
         )
         SELECT
           p.user_id,
           'chat',
           'New Message',
           $1,
           '/messages/' || $2,
           jsonb_build_object(
             'threadId', $2,
             'messageId', $3,
             'senderId', $4
           )
         FROM message_participants p
         WHERE p.thread_id = $2
         AND p.user_id != $4`,
        [content, threadId, result.rows[0].id, userId]
      )

      return {
        ...result.rows[0],
        senderName: '', // Will be populated by the query that fetches messages
        senderRole: isAdmin ? 'admin' : 'employee'
      }
    })
  }

  async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    await query(
      `UPDATE message_participants
       SET last_read_at = NOW()
       WHERE thread_id = $1 AND user_id = $2`,
      [threadId, userId]
    )
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM messages m
       INNER JOIN message_participants p ON p.thread_id = m.thread_id
       WHERE p.user_id = $1
       AND m.created_at > COALESCE(p.last_read_at, '1970-01-01')
       AND m.sender_id != $1`,
      [userId]
    )
    return parseInt(result?.count || '0', 10)
  }
}

export const messagesService = new MessagesService()