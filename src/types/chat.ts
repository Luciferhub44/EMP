export interface ChatMessage {
  id: string
  sessionId: string
  content: string
  role: 'user' | 'assistant'
  metadata?: Record<string, any>
  createdAt: string
}

export interface ChatSession {
  id: string
  userId: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ChatUser {
  id: string
  name: string
  role: "admin" | "employee"
  avatar?: string
  isOnline: boolean
  lastSeen?: string
} 