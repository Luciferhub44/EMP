interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// Create a new base service configuration
export const baseService = {
  async handleRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const { skipAuth = false, ...fetchOptions } = options;
      
      const headers = new Headers(fetchOptions.headers);
      if (!skipAuth) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      headers.set('Content-Type', 'application/json');

      const response = await fetch(endpoint, {
        ...fetchOptions,
        headers
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      return {} as T;

    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }
} 