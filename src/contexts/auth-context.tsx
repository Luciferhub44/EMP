import { createContext, useContext, useState, useEffect } from "react"
import { authService } from "@/lib/services/supabase/auth"
import type { Employee } from "@/types/employee"

interface AuthContextType {
  user: Employee | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
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
        const user = await authService.getCurrentUser()
        setUser(user)
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setError("Failed to initialize authentication")
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const { user } = await authService.signIn(email, password)
      setUser(user)
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Invalid credentials")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error("Logout failed:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
  }

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