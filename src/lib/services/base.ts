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
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      this.handleError(error, "Failed to fetch data")
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