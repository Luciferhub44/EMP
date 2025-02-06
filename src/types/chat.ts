export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userRole: "admin" | "employee"
  content: string
  timestamp: string
  attachments?: {
    id: string
    name: string
    url: string
    type: string
  }[]
}

export interface ChatUser {
  id: string
  name: string
  role: "admin" | "employee"
  avatar?: string
  isOnline: boolean
  lastSeen?: string
} 