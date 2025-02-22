import axios from 'axios'

const baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://emp-m7tx.onrender.com'  // Update this to your actual production URL
  : 'http://localhost:3000'

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const testConnection = async () => {
  try {
    const response = await api.get('/api/health')
    return response.status === 200
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

export default api 