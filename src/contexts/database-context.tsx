import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

interface DatabaseContextType {
  query: (text: string, params?: any[]) => Promise<any>
  isConnected: boolean
  error: string | null
}

// Create an API client for database operations
const dbClient = {
  query: async (text: string, params?: any[]) => {
    try {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, params }),
      })
      if (!response.ok) {
        throw new Error('Database query failed')
      }
      return response.json()
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }
}

const DatabaseContext = createContext<DatabaseContextType>({
  query: dbClient.query,
  isConnected: false,
  error: null
})

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/db/test', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Database connection test failed')
        }

        const data = await response.json()
        setIsConnected(data.success)
        setError(null)
      } catch (error) {
        setIsConnected(false)
        setError('Database connection failed')
      }
    }

    testConnection()
  }, [])

  return (
    <DatabaseContext.Provider value={{ 
      query: dbClient.query,
      isConnected,
      error
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => useContext(DatabaseContext)