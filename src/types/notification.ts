export type NotificationType = 
  | "order"
  | "inventory"
  | "payment"
  | "system"
  | "chat"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  timestamp: string
  actionUrl?: string
  metadata?: {
    orderId?: string
    productId?: string
    userId?: string
    amount?: number
  }
} 