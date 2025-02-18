import { createContext, useContext, ReactNode } from 'react'
import { chatWebSocket } from '@/lib/services/websocket'
import { useState, useEffect } from 'react'

const WebSocketContext = createContext<{
  socket: typeof chatWebSocket;
  isConnected: boolean;
  error: string | null;
}>({
  socket: chatWebSocket,
  isConnected: false,
  error: null
})

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('Authentication required')
      return
    }

    chatWebSocket.connect()
    setIsConnected(true)
    
    return () => {
      chatWebSocket.disconnect()
      setIsConnected(false)
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{
      socket: chatWebSocket,
      isConnected,
      error
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext) 