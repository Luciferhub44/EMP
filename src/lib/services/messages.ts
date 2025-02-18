import type { Message, ChatThread, Department, AdminChatIdentity } from "@/types/messages"
import { BaseService } from './base'

class MessagesService extends BaseService {
  async getThreads(userId: string, isAdmin: boolean) {
    return this.get<ChatThread[]>(`/messages/threads?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async getMessages(threadId: string, userId: string, isAdmin: boolean) {
    return this.get<Message[]>(`/messages/threads/${threadId}?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async startThread(employeeId: string, department: Department, initialMessage: string) {
    return this.post<ChatThread>('/messages/threads', {
      employeeId,
      department,
      initialMessage
    })
  }

  async sendMessage(threadId: string, content: string, userId: string, isAdmin: boolean) {
    return this.post<Message>(`/messages/threads/${threadId}/messages`, {
      content,
      userId,
      isAdmin
    })
  }

  async updateAdminIdentity(department: Department, updates: Partial<AdminChatIdentity>, userId: string, isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can update chat identities")
    return this.put<AdminChatIdentity>(`/messages/admin/${department}`, { ...updates, userId })
  }

  async getAdminIdentities(isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can view chat identities")
    return this.get<AdminChatIdentity[]>('/messages/admin/identities')
  }

  async getThread(threadId: string, userId: string, isAdmin: boolean) {
    return this.get<ChatThread>(`/messages/threads/${threadId}?userId=${userId}&isAdmin=${isAdmin}`)
  }
}

export const messagesService = new MessagesService() 