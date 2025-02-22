import axios from 'axios'

const baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://emp-m7tx.onrender.com/api'  // Add /api prefix
  : 'http://localhost:3000/api'

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000, // Increased timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

export const testConnection = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 }) // Removed /api prefix since it's in baseURL
    return response.data.status === 'healthy'
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

export default api 