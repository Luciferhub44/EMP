import { createContext, useContext, useState, useEffect, useCallback } from "react"
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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }

        const data = await response.json()
        setNotifications(data)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
        setError('Failed to load notifications')
      }
    }

    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    const newNotification: Notification = {
      ...notification,
      id: `not-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    )
  }, [])

  const clearAll = useCallback(() => {
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