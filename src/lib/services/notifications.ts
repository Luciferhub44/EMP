import { query, queryOne, transaction } from '@/lib/db'
import type { Notification } from '@/types/notification'

class NotificationService {
  async getNotifications(userId: string): Promise<Notification[]> {
    return query<Notification>(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    )
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    )
    return parseInt(result?.count || '0', 10)
  }

  async createNotification(
    userId: string,
    notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>
  ): Promise<Notification> {
    return queryOne<Notification>(
      `INSERT INTO notifications (
         user_id,
         type,
         title,
         message,
         action_url,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        notification.type,
        notification.title,
        notification.message,
        notification.actionUrl,
        JSON.stringify(notification.metadata || {})
      ]
    )
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET is_read = true,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    )
  }

  async markAllAsRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET is_read = true,
           updated_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    )
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    )
  }

  async createBulkNotifications(
    userIds: string[],
    notification: Omit<Notification, 'id' | 'isRead' | 'timestamp' | 'userId'>
  ): Promise<void> {
    await transaction(async (client) => {
      const values = userIds.map(userId => `(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        '${userId}'
      )`).join(', ')

      await client.query(
        `INSERT INTO notifications (
          type,
          title,
          message,
          action_url,
          metadata,
          is_read,
          user_id
        ) VALUES ${values}`,
        [
          notification.type,
          notification.title,
          notification.message,
          notification.actionUrl,
          JSON.stringify(notification.metadata || {}),
          false
        ]
      )
    })
  }

  async getNotificationsByType(
    userId: string,
    type: Notification['type']
  ): Promise<Notification[]> {
    return query<Notification>(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND type = $2
       ORDER BY created_at DESC`,
      [userId, type]
    )
  }

  async cleanupOldNotifications(olderThan: Date): Promise<void> {
    await query(
      `DELETE FROM notifications
       WHERE created_at < $1
       AND is_read = true`,
      [olderThan]
    )
  }

  async getNotificationPreferences(userId: string): Promise<{
    email: boolean
    orders: boolean
    chat: boolean
  }> {
    const result = await queryOne<{ notifications: any }>(
      `SELECT settings->>'notifications' as notifications
       FROM settings
       WHERE user_id = $1`,
      [userId]
    )

    return result?.notifications || {
      email: true,
      orders: true,
      chat: true
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: {
      email?: boolean
      orders?: boolean
      chat?: boolean
    }
  ): Promise<void> {
    await query(
      `UPDATE settings
       SET settings = jsonb_set(
         settings,
         '{notifications}',
         settings->'notifications' || $2::jsonb
       )
       WHERE user_id = $1`,
      [userId, JSON.stringify(preferences)]
    )
  }
}

export const notificationService = new NotificationService()