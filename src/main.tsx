import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { testConnection } from '@/lib/api'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    // Test API connection instead of direct DB connection
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('API connection failed')
    }
    console.log('API connected successfully')

    // Render app
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (error) {
    console.error('Connection failed:', error)
    // Show error UI
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Connection Error</h1>
        <p style="color: red; margin: 20px 0;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `
  }
}

init()