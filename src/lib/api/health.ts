import type { Request, Response } from 'express'
import { testConnection } from '@/lib/db'

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
}

export async function healthCheck(req: Request, res: Response<HealthResponse>) {
  try {
    const isHealthy = await testConnection()
    
    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    })
  }
}

export default healthCheck
