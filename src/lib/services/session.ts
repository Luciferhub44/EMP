import type { Session } from "@/types/session"

export const sessionService = {
  createSession: async (userId: string, token: string): Promise<Session> => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        userId,
        token
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    return response.json()
  },

  getSession: async (token: string): Promise<Session | null> => {
    try {
      const response = await fetch(`/api/sessions/${token}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        return null
      }

      return response.json()
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  },

  deleteSession: async (token: string): Promise<void> => {
    const response = await fetch(`/api/sessions/${token}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete session')
    }
  },

  deleteAllUserSessions: async (userId: string): Promise<void> => {
    const response = await fetch(`/api/sessions/user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete user sessions')
    }
  }
} 