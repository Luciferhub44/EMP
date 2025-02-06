import { ChatMessage, ChatUser } from "@/types/chat"
import { chatWebSocket } from "./websocket"

interface SendMessageParams {
  content: string
  attachments?: File[]
}

class ChatService {
  private currentUser: ChatUser = {
    id: "user1", // This would come from auth
    name: "John Admin",
    role: "admin",
    isOnline: true
  }

  constructor() {
    chatWebSocket.connect()
    this.setupWebSocketListeners()
  }

  private setupWebSocketListeners() {
    chatWebSocket.onMessage((message) => {
      // Handle different message types
      switch (message.type) {
        case "new_message":
          this.handleNewMessage(message.data)
          break
        case "user_status":
          this.handleUserStatus(message.data)
          break
      }
    })
  }

  private handleNewMessage(message: ChatMessage) {
    // Broadcast to all subscribers
    this.messageCallbacks.forEach(callback => callback(message))
  }

  private handleUserStatus(user: ChatUser) {
    // Broadcast to all subscribers
    this.userStatusCallbacks.forEach(callback => callback(user))
  }

  private messageCallbacks: ((message: ChatMessage) => void)[] = []
  private userStatusCallbacks: ((user: ChatUser) => void)[] = []

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback)
  }

  onUserStatusChange(callback: (user: ChatUser) => void) {
    this.userStatusCallbacks.push(callback)
  }

  async sendMessage({ content, attachments }: SendMessageParams): Promise<ChatMessage> {
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

    chatWebSocket.sendMessage({
      type: "new_message",
      data: message
    })

    return message
  }

  private async uploadFiles(files: File[]): Promise<ChatMessage["attachments"]> {
    // In a real app, this would upload to your server/cloud storage
    return Promise.all(
      files.map(async (file) => ({
        id: `att-${Date.now()}-${file.name}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type
      }))
    )
  }

  getCurrentUser(): ChatUser {
    return this.currentUser
  }
}

export const chatService = new ChatService() 