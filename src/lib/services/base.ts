import { toast } from "@/components/ui/use-toast"

export class BaseService {
  protected handleError(error: unknown, customMessage?: string) {
    console.error(error)
    toast({
      title: "Error",
      description: customMessage || "An unexpected error occurred",
      variant: "destructive",
    })
    throw error
  }

  protected handleSuccess(message: string) {
    toast({
      title: "Success",
      description: message,
    })
  }

  protected async fetchWithAuth<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = new Headers(options.headers)
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      
      headers.set('Content-Type', 'application/json')

      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/sign-in'
        throw new Error('Session expired')
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json() as T
    } catch (error) {
      this.handleError(error, "Request failed")
      throw error
    }
  }

  protected async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  protected async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.fetchWithAuth<T>(endpoint, {
      method: 'DELETE',
    })
  }

  protected async get<T>(endpoint: string): Promise<T> {
    return this.fetchWithAuth<T>(endpoint)
  }
} 