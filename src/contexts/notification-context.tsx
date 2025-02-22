import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { notificationService } from '@/lib/services/supabase/notifications'
import { useAuth } from '@/contexts/auth-context'
import type { Notification } from "@/types/notification"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  error: string | null
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    
    const fetchNotifications = async () => {
      try {
        const data = await notificationService.getNotifications(user?.id || '')
        setNotifications(data)
      } catch (error) {
        console.error('Failed to load notifications:', error)
        setError('Failed to load notifications')
      }
    }

    fetchNotifications()
  }, [user])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const addNotification = useCallback(async (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    try {
      await notificationService.createNotification(user?.id || '', notification)
      const updatedNotifications = await notificationService.getNotifications(user?.id || '')
      setNotifications(updatedNotifications)
    } catch (error) {
      console.error('Failed to create notification:', error)
      setError('Failed to create notification')
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId, user?.id || '')
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      setError('Failed to mark notification as read')
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    if (!user) return
    
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    )
  }, [])

  const clearAll = useCallback(() => {
    if (!user) return
    
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        error
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}