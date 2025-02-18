import type { Message, ChatThread, Department, AdminChatIdentity } from "@/types/messages"
import { baseService } from './base'

export const messagesService = {
  // Get threads for a user
  getThreads: async (userId: string, isAdmin: boolean) => {
    try {
      return await baseService.handleRequest<ChatThread[]>(`/api/messages/threads?userId=${userId}&isAdmin=${isAdmin}`, {
        method: 'GET'
      })
    } catch (error) {
      console.error('Failed to fetch threads:', error)
      return []
    }
  },

  // Get messages for a thread
  getMessages: async (threadId: string, userId: string, isAdmin: boolean) => {
    try {
      return await baseService.handleRequest<Message[]>(`/api/messages/threads/${threadId}?userId=${userId}&isAdmin=${isAdmin}`, {
        method: 'GET'
      })
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      return []
    }
  },

  // Start a new thread
  startThread: (
    employeeId: string,
    department: Department,
    initialMessage: string
  ) =>
    baseService.handleRequest<ChatThread>('/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        department,
        initialMessage
      })
    }),

  // Send a message
  sendMessage: (
    threadId: string,
    content: string,
    userId: string,
    isAdmin: boolean
  ) =>
    baseService.handleRequest<Message>(`/api/messages/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        userId,
        isAdmin
      })
    }),

  // Admin methods
  updateAdminIdentity: (
    department: Department,
    updates: Partial<AdminChatIdentity>,
    userId: string,
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can update chat identities")
    }
    return baseService.handleRequest<AdminChatIdentity>(`/api/messages/admin/${department}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, userId })
    })
  },

  getAdminIdentities: (isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can view chat identities")
    }
    return baseService.handleRequest<AdminChatIdentity[]>('/api/messages/admin/identities')
  },

  getThread: async (threadId: string, userId: string, isAdmin: boolean) => {
    try {
      return await baseService.handleRequest<ChatThread>(`/api/messages/threads/${threadId}?userId=${userId}&isAdmin=${isAdmin}`, {
        method: 'GET'
      })
    } catch (error) {
      console.error('Failed to fetch thread:', error)
      throw new Error('Failed to fetch thread')
    }
  }
} 