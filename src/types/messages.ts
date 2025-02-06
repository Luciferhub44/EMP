export type MessageRole = 'admin' | 'employee'
export type Department = 'support' | 'fulfillment' | 'billing' | 'management'

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderRole: MessageRole
  department: Department
  content: string
  timestamp: string
  read: boolean
}

export interface ChatThread {
  id: string
  department: Department
  participants: {
    id: string
    name: string
    role: MessageRole
  }[]
  lastMessage?: Message
  createdAt: string
  updatedAt: string
}

export interface AdminChatIdentity {
  name: string
  department: Department
  active: boolean
} 