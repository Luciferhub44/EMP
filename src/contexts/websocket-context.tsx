import { createContext, useContext, ReactNode } from 'react'
import { chatWebSocket } from '@/lib/services/websocket'

const WebSocketContext = createContext(chatWebSocket)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  return (
    <WebSocketContext.Provider value={chatWebSocket}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext) 