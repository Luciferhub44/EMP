import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { supabase } from '@/lib/supabase'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// Initialize app
const init = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('users').select('count')
    
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`)
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
        <p style="color: red; margin: 20px 0;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style="margin-bottom: 20px;">
          Please make sure your environment variables are properly configured.
        </p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `
  }
}

init()