import { Product } from "@/types/products"
import type { Employee } from "@/types/employee"
import axios from 'axios'
import { hashPassword, verifyPassword } from './password'
import { query, queryOne } from '@/lib/db'

interface ApiError extends Error {
  status?: number;
  code?: string;
}

const baseURL = import.meta.env.VITE_API_URL || '/api'

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('sessionId')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const api = {
  async get<T extends Record<string, any>>(endpoint: string, token?: string) {
    try {
      return await query<T>(`SELECT * FROM ${endpoint}`)
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  async post<T extends Record<string, any>>(endpoint: string, data: Record<string, any>) {
    try {
      const columns = Object.keys(data).join(', ')
      const values = Object.values(data)
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
      console.error('API Error:', error)
      throw error
    }
  },

  auth: {
    async login(email: string, password: string) {
      try {
        const user = await queryOne<Employee & { password_hash: string }>(
          'SELECT * FROM users WHERE email = $1',
          [email]
        )

        if (!user) {
          throw new Error('Invalid credentials')
        }

        const isValid = await verifyPassword(password, user.password_hash)
        if (!isValid) {
          throw new Error('Invalid credentials')
        }

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
        console.error('Auth Error:', error)
        throw error
      }
    },

    async validateSession(token: string) {
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
        console.error('Auth Error:', error)
        throw error
      }
    },

    async logout(token: string) {
      try {
        await query('DELETE FROM user_sessions WHERE id = $1', [token])
      } catch (error) {
        console.error('Auth Error:', error)
        throw error
      }
    }
  },

  http: axiosInstance
}