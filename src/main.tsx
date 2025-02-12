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
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch('/api/db/test');
        const data = await response.json();
        console.log('API connection test:', data);
        break;
      } catch (error) {
        retries++;
        console.warn(`API connection attempt ${retries} failed:`, error);
        if (retries === maxRetries) {
          console.error('Failed to connect to API after multiple attempts');
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Test API connection
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