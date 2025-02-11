import { ChatMessage, ChatUser } from "@/types/chat"
import { chatWebSocket } from "./websocket"
import { db } from "@/lib/db"

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
    // Store message in database
    await db.query(
      'INSERT INTO chat_messages (id, data) VALUES ($1, $2)',
      [message.id, message]
    )
    this.messageCallbacks.forEach(callback => callback(message))
  }

  private async handleUserStatus(user: ChatUser) {
    // Update user status in database
    await db.query(
      'UPDATE chat_users SET data = $1 WHERE id = $2',
      [user, user.id]
    )
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

    // Store in database first
    await db.query(
      'INSERT INTO chat_messages (id, data) VALUES ($1, $2)',
      [message.id, message]
    )

    // Then broadcast
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