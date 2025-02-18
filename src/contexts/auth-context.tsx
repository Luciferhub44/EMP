import type { Employee } from "@/types/employee"
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"

interface AuthContextType {
  user: Employee | null
  loading: boolean
  error: string | null
  login: (agentId: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (!token) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/auth/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const { user } = await response.json()
          setUser(user)
        } else {
          localStorage.removeItem("auth_token")
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setError("Failed to initialize authentication")
        localStorage.removeItem("auth_token")
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [])

  const login = async (agentId: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId.toUpperCase(),
          password
        })
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const { token, user } = await response.json()
      localStorage.setItem("auth_token", token)
      setUser(user)
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token")
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setUser(null)
      localStorage.removeItem("auth_token")
    }
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