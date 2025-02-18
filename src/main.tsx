import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    // Add retry logic for API connection
    const maxRetries = 3
    let retries = 0
    let connected = false
    
    while (retries < maxRetries && !connected) {
      try {
        const response = await fetch('/api/db/test')
        if (!response.ok) throw new Error('API test failed')
        const data = await response.json()
        console.log('API connection test:', data)
        connected = true
      } catch (error) {
        retries++
        console.warn(`API connection attempt ${retries} failed:`, error)
        if (retries === maxRetries) {
          throw new Error('Failed to connect to API after multiple attempts')
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Render app
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (error) {
    console.error('Initialization failed:', error)
    // Show error UI
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Failed to start application</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `
  }
}

init()