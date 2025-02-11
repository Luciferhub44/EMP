export interface Session {
  id: string
  userId: string
  token: string
  createdAt: string
  expiresAt: string
  lastActivity?: string
  userAgent?: string
  ipAddress?: string
  isValid?: boolean
}

export interface SessionMetadata {
  browser: string
  os: string
  device: string
  location?: {
    city?: string
    country?: string
    ip: string
  }
}

export interface ActiveSession extends Session {
  metadata: SessionMetadata
  currentDevice: boolean
} 