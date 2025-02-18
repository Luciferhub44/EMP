import { baseService } from './base'
import type { Session } from "@/types/session"

export const sessionService = {
  createSession: (userId: string, token: string) =>
    baseService.handleRequest<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId, token })
    }),

  getSession: (token: string) =>
    baseService.handleRequest<Session | null>(`/api/sessions/${token}`),

  deleteSession: (token: string) =>
    baseService.handleRequest<void>(`/api/sessions/${token}`, {
      method: 'DELETE'
    }),

  deleteAllUserSessions: (userId: string) =>
    baseService.handleRequest<void>(`/api/sessions/user/${userId}`, {
      method: 'DELETE'
    })
} 