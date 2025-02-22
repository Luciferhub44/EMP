import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { query, testConnection } from '@/lib/db'
import { useAuth } from '@/contexts/auth-context'

interface DatabaseContextType {
  query: (text: string, params?: any[]) => Promise<any>
  isConnected: boolean
  error: string | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  query: async () => { throw new Error('Database context not initialized') },
  isConnected: false,
  error: null
})

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    
    const checkConnection = async () => {
      try {
        const connected = await testConnection()
        setIsConnected(connected)
        setError(null)
      } catch (error) {
        setIsConnected(false)
        setError(error instanceof Error ? error.message : 'Database connection failed')
      }
    }

    checkConnection()
  }, [user])

  const executeQuery = async (text: string, params?: any[]) => {
    try {
      return await query(text, params)
    } catch (error) {
      console.error('Query error:', error)
      throw error
    }
  }

  return (
    <DatabaseContext.Provider value={{ 
      query: executeQuery,
      isConnected,
      error
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}