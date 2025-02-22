import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface DatabaseContextType {
  query: (endpoint: string) => Promise<any>
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
    const checkConnection = async () => {
      try {
        const response = await api.get('/health')
        setIsConnected(response.status === 200)
        setError(null)
      } catch (error) {
        setIsConnected(false)
        setError(error instanceof Error ? error.message : 'Connection failed')
      }
    }

    checkConnection()
  }, [user])

  return (
    <DatabaseContext.Provider value={{ 
      query: api.get,
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