import { baseService } from './base'
import type { ChatMessage, ChatUser } from "@/types/chat"
import { chatWebSocket } from "./websocket"

interface SendMessageParams {
  content: string
  attachments?: File[]
}

class ChatService {
  private currentUser: ChatUser | null = null
  private messageCallbacks: ((message: ChatMessage) => void)[] = []
  private userStatusCallbacks: ((user: ChatUser) => void)[] = []

  constructor() {
    chatWebSocket.connect()
    this.setupWebSocketListeners()
    this.initializeCurrentUser()
  }

  private async initializeCurrentUser() {
    try {
      const userData = await baseService.handleRequest<ChatUser>('/api/auth/me')
      this.currentUser = {
        ...userData,
        isOnline: true
      }
    } catch (error) {
      console.error('Failed to initialize chat user:', error)
    }
  }

  private setupWebSocketListeners() {
    chatWebSocket.onMessage(async (message) => {
      switch (message.type) {
        case "new_message":
          await this.handleNewMessage(message.data)
          break
        case "user_status":
          await this.handleUserStatus(message.data)
          break
      }
    })
  }

  private async handleNewMessage(message: ChatMessage) {
    try {
      await baseService.handleRequest<void>('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify(message)
      })
      this.messageCallbacks.forEach(callback => callback(message))
    } catch (error) {
      console.error('Failed to handle new message:', error)
    }
  }

  private async handleUserStatus(user: ChatUser) {
    try {
      await baseService.handleRequest<void>(`/api/chat/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isOnline: user.isOnline })
      })
      this.userStatusCallbacks.forEach(callback => callback(user))
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback)
  }

  onUserStatusChange(callback: (user: ChatUser) => void) {
    this.userStatusCallbacks.push(callback)
  }

  async sendMessage({ content, attachments }: SendMessageParams): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error('User not initialized')
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      content,
      timestamp: new Date().toISOString(),
    }

    if (attachments?.length) {
      message.attachments = await this.uploadFiles(attachments)
    }

    await baseService.handleRequest<void>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    })

    chatWebSocket.sendMessage({
      type: "new_message",
      data: message
    })

    return message
  }

  private async uploadFiles(files: File[]): Promise<ChatMessage["attachments"]> {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    return baseService.handleRequest<ChatMessage["attachments"]>('/api/chat/upload', {
      method: 'POST',
      body: formData
    })
  }

  getCurrentUser(): ChatUser | null {
    return this.currentUser
  }
}

export const chatService = new ChatService() 