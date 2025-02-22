type MessageCallback = (message: any) => void
type StatusCallback = (status: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private messageCallbacks: MessageCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout = 3000
  private heartbeatInterval: number | null = null
  private lastPingTime = 0

  constructor(private url: string) {}

  async connect() {
    try {
      this.ws = new WebSocket(this.url)
      this.setupEventListeners()
      this.startHeartbeat()
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.attemptReconnect()
    }
  }

  private setupEventListeners() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.notifyStatusChange(true)
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          this.handlePong()
          return
        }

        const message = JSON.parse(event.data)
        this.notifyMessageReceived(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.notifyStatusChange(false)
      this.stopHeartbeat()
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        this.ws.send('ping')

        // Check if we missed too many pongs
        if (this.lastPingTime - this.lastPingTime > 30000) {
          console.warn('No pong received, reconnecting...')
          this.ws.close()
        }
      }
    }, 15000) // Send ping every 15 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handlePong() {
    this.lastPingTime = Date.now()
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
    }, this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1)) // Exponential backoff
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
      throw new Error('WebSocket is not connected')
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
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async waitForConnection(timeout = 5000): Promise<boolean> {
    if (this.isConnected()) {
      return true
    }

    return new Promise((resolve) => {
      const start = Date.now()
      const checkConnection = () => {
        if (this.isConnected()) {
          resolve(true)
          return
        }

        if (Date.now() - start > timeout) {
          resolve(false)
          return
        }

        setTimeout(checkConnection, 100)
      }

      checkConnection()
    })
  }
}

// Create WebSocket service instance
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
export const chatWebSocket = new WebSocketService(wsUrl)