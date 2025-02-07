import * as React from "react"
import type { Notification } from "@/types/notification"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: "not-1",
      type: "order",
      title: "New Order Received",
      message: "Order #ORD-001 has been placed and is awaiting confirmation.",
      isRead: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actionUrl: "/orders/ORD-001",
      metadata: {
        orderId: "ORD-001"
      }
    },
    {
      id: "not-2",
      type: "inventory",
      title: "Low Stock Alert",
      message: "Mini Excavator (EX-001) stock is below minimum threshold.",
      isRead: true,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      actionUrl: "/products/EX-001/inventory",
      metadata: {
        productId: "EX-001"
      }
    },
    {
      id: "not-3",
      type: "payment",
      title: "Payment Received",
      message: "Payment of $32,000 received for Order #ORD-001",
      isRead: false,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      metadata: {
        orderId: "ORD-001",
        amount: 32000
      }
    }
  ])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const addNotification = React.useCallback((notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    const newNotification: Notification = {
      ...notification,
      id: `not-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const markAsRead = React.useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
  }, [])

  const markAllAsRead = React.useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    )
  }, [])

  const clearAll = React.useCallback(() => {
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 