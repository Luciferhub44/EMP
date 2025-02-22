import type { Employee } from "@/types/employee"
import { query, queryOne } from '@/lib/db'
import { hashPassword, verifyPassword } from './password'
import { Product } from "@/types/products";

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

const handleError = (error: unknown) => {
  console.error('API Error:', error)
  throw error
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  const token = localStorage.getItem('sessionId')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: getHeaders()
  })
  return handleResponse<T>(response)
}

async function post<T>(url: string, data: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse<T>(response)
}

export const api = {
  async get<T>(endpoint: string, token?: string) {
    try {
      return await query<T>(`SELECT * FROM ${endpoint}`)
    } catch (error) {
      handleError(error)
    }
  },

  async post<T>(endpoint: string, data: unknown, token?: string) {
    try {
      const columns = Object.keys(data as object).join(', ')
      const values = Object.values(data as object)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const result = await queryOne<T>(
        `INSERT INTO ${endpoint} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      )
      
      if (!result) {
        throw new Error('Failed to create record')
      }
      
      return result
    } catch (error) {
      handleError(error)
    }
  },

  auth: {
    async login(email: string, password: string): Promise<LoginResponse | undefined> {
      try {
        // Get user by email
        const user = await queryOne<Employee & { password_hash: string }>(
          'SELECT * FROM users WHERE email = $1',
          [email]
        )

        if (!user) {
          throw new Error('Invalid credentials')
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash)
        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        // Create session
        const sessionId = crypto.randomUUID()
        await query(
          'INSERT INTO user_sessions (id, user_id) VALUES ($1, $2)',
          [sessionId, user.id]
        )

        const { password_hash, ...userWithoutPassword } = user
        return {
          token: sessionId,
          user: userWithoutPassword
        }
      } catch (error) {
        handleError(error)
      }
    },

    async validateSession(token: string): Promise<SessionResponse | undefined> {
      try {
        const user = await queryOne<Employee>(
          `SELECT u.* FROM users u
           INNER JOIN user_sessions s ON s.user_id = u.id
           WHERE s.id = $1 AND s.expires_at > NOW()`,
          [token]
        )

        if (!user) {
          throw new Error('Invalid or expired session')
        }

        return { user }
      } catch (error) {
        handleError(error)
      }
    },

    async logout(token: string): Promise<void> {
      try {
        await query(
          'DELETE FROM user_sessions WHERE id = $1',
          [token]
        )
      } catch (error) {
        handleError(error)
      }
    }
  },

  async getProduct(id: string) {
    try {
      const response = await fetch(`/api/products/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch product')
      }
      return await response.json()
    } catch (error) {
      console.error('API error:', error)
      throw error
    }
  },

  async updateProduct(id: string, data: Partial<Product>) {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update product')
      }
      return await response.json()
    } catch (error) {
      console.error('API error:', error)
      throw error
    }
  }
}