import { healthCheck } from './db.js'

export async function GET(req, res) {
  try {
    const isHealthy = await healthCheck()
    if (isHealthy) {
      return res.status(200).json({ status: 'healthy' })
    } else {
      return res.status(503).json({ status: 'unhealthy' })
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(500).json({ status: 'error', message: error.message })
  }
}
