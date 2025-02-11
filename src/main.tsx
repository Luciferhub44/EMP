import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App'
import { initializeDatabase } from '@/lib/api/db'

// Initialize database before rendering
initializeDatabase().then(() => {
  console.log('Database initialized')
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Failed to find the root element')

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(error => {
  console.error('Database initialization failed:', error)
  // You might want to show an error UI here
})
