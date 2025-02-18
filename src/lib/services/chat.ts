import { BaseService } from './base'
import type { ChatMessage, ChatUser } from "@/types/chat"
import { chatWebSocket } from "./websocket"

class ChatService extends BaseService {
  private currentUser: ChatUser | null = null
  private messageCallbacks: ((message: ChatMessage) => void)[] = []
  private userStatusCallbacks: ((user: ChatUser) => void)[] = []

  constructor() {
    super()
    chatWebSocket.connect()
    this.setupWebSocketListeners()
    this.initializeCurrentUser()
  }

  private async initializeCurrentUser() {
    try {
      const userData = await this.get<ChatUser>('/auth/me')
      this.currentUser = {
        ...userData,
        isOnline: true
      }
    } catch (error) {
      this.handleError(error, 'Failed to initialize chat user')
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
      await this.post<void>('/chat/messages', message)
      this.messageCallbacks.forEach(callback => callback(message))
    } catch (error) {
      this.handleError(error, 'Failed to handle new message')
    }
  }

  private async handleUserStatus(user: ChatUser) {
    try {
      await this.put<void>(`/chat/users/${user.id}/status`, { isOnline: user.isOnline })
      this.userStatusCallbacks.forEach(callback => callback(user))
    } catch (error) {
      this.handleError(error, 'Failed to update user status')
    }
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback)
  }

  onUserStatusChange(callback: (user: ChatUser) => void) {
    this.userStatusCallbacks.push(callback)
  }

  async sendMessage(content: string, attachments?: File[]): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error('User not initialized')
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      content,
      timestamp: new Date().toISOString(),
      userRole: this.currentUser.role,
    }

    if (attachments?.length) {
      message.attachments = await this.uploadFiles(attachments)
    }

    await this.post<void>('/chat/messages', message)
    chatWebSocket.sendMessage({
      type: "new_message",
      data: message
    })

    return message
  }

  private async uploadFiles(files: File[]): Promise<ChatMessage["attachments"]> {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    return this.post<ChatMessage["attachments"]>('/chat/upload', formData)
  }

  getCurrentUser(): ChatUser | null {
    return this.currentUser
  }
}

export const chatService = new ChatService() 
