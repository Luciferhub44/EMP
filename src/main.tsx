import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { testConnection } from '@/lib/db'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('Database connection failed')
    }
    console.log('Database connected successfully')

    // Render app
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (error) {
    console.error('Database connection failed:', error)
    // Show error UI
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Database Connection Error</h1>
        <p style="color: red; margin: 20px 0;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style="margin-bottom: 20px;">
          Please make sure your database configuration is correct and the database is running.
        </p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `
  }
}

init()