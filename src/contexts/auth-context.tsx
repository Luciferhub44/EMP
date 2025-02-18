import type { Employee } from "@/types/employee"
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
import { authService } from "@/lib/services/auth"

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
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (!token) {
          setLoading(false)
          return
        }

        const { user } = await authService.validateSession()
        setUser(user)
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

      const { token, user } = await authService.login(agentId, password)
      
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
      await authService.logout()
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