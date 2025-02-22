import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
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