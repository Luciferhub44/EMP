import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App'
import { initializeDatabase } from '@/lib/db'

// Initialize database before rendering
initializeDatabase().then(() => {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Failed to find the root element')

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(error => {
  console.error('Failed to initialize database:', error)
  // You might want to show an error UI here
})
