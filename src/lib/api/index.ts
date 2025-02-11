import { db, query } from './db'

export const api = {
  async get(endpoint: string) {
    try {
      const response = await fetch(`/api${endpoint}`)
      return response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  async post(endpoint: string, data: any) {
    try {
      const response = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      return response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  // Database helpers
  db: {
    query,
    pool: db
  }
} 