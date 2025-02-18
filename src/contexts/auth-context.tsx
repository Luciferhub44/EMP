import type { Employee } from "@/types/employee"
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
interface AuthContextType {
  user: Employee | null
  loading: boolean
  error: string | null
  login: (agentId: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (!token) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/auth/session', {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        })

        if (!response.ok) {
          throw new Error('Session validation failed')
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setError("Failed to initialize authentication")
        localStorage.removeItem("auth_token")
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (agentId: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          password
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Login failed")
      }

      const { user: userData, token } = await response.json()
      setUser(userData)
      localStorage.setItem("auth_token", token)
      
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("auth_token")
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
  }), [user, loading, error, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}