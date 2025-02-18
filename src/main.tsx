import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response
}

// Initialize app
const init = async () => {
  try {
    // Check server health first
    const maxRetries = 3
    let retries = 0
    
    while (retries < maxRetries) {
      try {
        await apiRequest('/health')
        console.log('Server connection verified')
        break
      } catch (error) {
        retries++
        console.warn(`Connection attempt ${retries} failed:`, error)
        if (retries === maxRetries) {
          throw new Error('Failed to connect to server')
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)))
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
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Failed to start application</h1>
        <p>${error instanceof Error ? error.message : 'Connection error'}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `
  }
}

init()