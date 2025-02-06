type MessageCallback = (message: any) => void
type StatusCallback = (status: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private messageCallbacks: MessageCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 3000

  constructor(private url: string) {}

  connect() {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.notifyStatusChange(true)
      }

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        this.notifyMessageReceived(message)
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.notifyStatusChange(false)
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectTimeout)
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  onMessage(callback: MessageCallback) {
    this.messageCallbacks.push(callback)
  }

  onStatusChange(callback: StatusCallback) {
    this.statusCallbacks.push(callback)
  }

  private notifyMessageReceived(message: any) {
    this.messageCallbacks.forEach(callback => callback(message))
  }

  private notifyStatusChange(status: boolean) {
    this.statusCallbacks.forEach(callback => callback(status))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const chatWebSocket = new WebSocketService('ws://your-websocket-server-url') 