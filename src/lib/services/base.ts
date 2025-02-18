// Create a new base service configuration
export const baseService = {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    get Authorization() {
      return `Bearer ${localStorage.getItem('auth_token')}`
    }
  },

  async handleRequest<T>(
    url: string, 
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options?.headers
        }
      })

      if (!response.ok) {
        throw new Error(response.statusText || 'Request failed')
      }

      return response.json()
    } catch (error) {
      console.error(`API Error: ${url}`, error)
      throw error
    }
  }
} 