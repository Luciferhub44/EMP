import { BaseService } from './base'
import type { Session } from "@/types/session"

class SessionService extends BaseService {
  async createSession(userId: string, token: string) {
    return this.post<Session>('/sessions', { userId, token })
  }

  async getSession(token: string) {
    return this.get<Session | null>(`/sessions/${token}`)
  }

  async deleteSession(token: string) {
    return this.delete<void>(`/sessions/${token}`)
  }

  async deleteAllUserSessions(userId: string) {
    return this.delete<void>(`/sessions/user/${userId}`)
  }
}

export const sessionService = new SessionService() 