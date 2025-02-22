import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/notification'

export const notificationService = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  },

  async createNotification(
    userId: string,
    notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>
  ) {
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: notification.type,
      p_title: notification.title,
      p_message: notification.message,
      p_action_url: notification.actionUrl,
      p_metadata: notification.metadata
    })

    if (error) throw error
    return data
  },

  async markAsRead(notificationId: string, userId: string) {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_user_id: userId
    })

    if (error) throw error
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  },

  async deleteNotification(notificationId: string, userId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error
  }
}