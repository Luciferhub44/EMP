import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    const token = localStorage.getItem('token')
    
    // If no token, render app directly (will redirect to login)
    if (!token) {
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      )
      return
    }

    // Check server connection
    const maxRetries = 3
    let retries = 0
    let connected = false
    
    while (retries < maxRetries && !connected) {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          connected = true
          console.log('Server connection verified')
        } else {
          throw new Error('Server connection failed')
        }
      } catch (error) {
        retries++
        console.warn(`Connection attempt ${retries} failed:`, error)
        if (retries === maxRetries) {
          throw new Error('Failed to connect to server after multiple attempts')
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