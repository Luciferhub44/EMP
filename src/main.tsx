import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    // Test API connection
    const response = await fetch('/api/db/test')
    const data = await response.json()
    console.log('API connection test:', data)
  } catch (error) {
    console.warn('API connection failed:', error)
    // Continue loading app even if API fails
  }

  // Render app
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

init().catch(console.error)