import type { Employee } from "@/types/employee"

interface ApiError extends Error {
  status?: number;
  code?: string;
}

interface LoginResponse {
  token: string;
  user: Omit<Employee, 'passwordHash'>;
}

interface SessionResponse {
  user: Omit<Employee, 'passwordHash'>;
}

const BASE_URL = '/api';

export const api = {
  async get<T>(endpoint: string, token?: string) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, { 
        method: 'GET',
        headers 
      })

      if (!response.ok) {
        const error: ApiError = new Error('API request failed')
        error.status = response.status
        throw error
      }

      return response.json() as Promise<T>
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  async post<T>(endpoint: string, data: unknown, token?: string) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error: ApiError = new Error('API request failed')
        error.status = response.status
        throw error
      }

      return response.json() as Promise<T>
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  auth: {
    async login(agentId: string, password: string): Promise<LoginResponse> {
      return api.post<LoginResponse>('/auth/login', { 
        agentId: agentId.toUpperCase(), 
        password 
      })
    },

    async validateSession(token: string): Promise<SessionResponse> {
      return api.get<SessionResponse>('/auth/session', token)
    },

    async logout(token: string): Promise<void> {
      return api.post<void>('/auth/logout', {}, token)
    }
  }
} 