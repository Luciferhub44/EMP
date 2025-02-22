import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface DatabaseContextType {
  query: (endpoint: string) => Promise<any>
  isConnected: boolean
  error: string | null
  retryConnection: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType>({
  query: async () => { throw new Error('Database context not initialized') },
  isConnected: false,
  error: null,
  retryConnection: async () => {}
})

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const checkConnection = async () => {
    try {
      const response = await api.get('/api/health', { timeout: 3000 })
      const isHealthy = response.data.status === 'healthy'
      setIsConnected(isHealthy)
      setError(isHealthy ? null : 'Database connection unhealthy')
    } catch (error) {
      setIsConnected(false)
      setError(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const retryConnection = async () => {
    setError(null)
    await checkConnection()
  }

  useEffect(() => {
    checkConnection()
    
    // Poll health check every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [user])

  return (
    <DatabaseContext.Provider value={{ 
      query: api.get,
      isConnected,
      error,
      retryConnection
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}