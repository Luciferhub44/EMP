import express from 'express'
import { healthCheck } from './db.js'

const app = express()
const port = process.env.HEALTH_PORT || 10000

app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await healthCheck()
    if (isHealthy) {
      return res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    }
    return res.status(503).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Start health check server
app.listen(port, () => {
  console.log(`Health check server running on port ${port}`)
})
