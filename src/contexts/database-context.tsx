import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
    
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('users').select('count')
        if (error) {
          throw error
        }
        setIsConnected(true)
        setError(null)
      } catch (error) {
        setIsConnected(false)
        setError(error instanceof Error ? error.message : 'Database connection failed')
      }
    }

    testConnection()
  }, [user])

  const query = async (text: string, params?: any[]) => {
    try {
      const { data, error } = await supabase.rpc('execute_query', {
        query_text: text,
        query_params: params
      })
      
      if (error) {
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Query error:', error)
      throw error
    }
  }

  return (
    <DatabaseContext.Provider value={{ 
      query,
      isConnected,
      error
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => useContext(DatabaseContext)