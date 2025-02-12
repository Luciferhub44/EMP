import * as React from "react"
import type { Employee } from "@/types/employee"
import { db } from "@/lib/api/db"

interface AuthContextType {
  user: Employee | null
  loading: boolean
  error: string | null
  login: (agentId: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Employee | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (token) {
          // Verify session
          const response = await fetch('/api/auth/session', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            localStorage.removeItem("auth_token")
          }
        }
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

      // Log the attempt
      console.log('Login attempt:', { agentId })

      const { rows } = await db.query(
        `SELECT data FROM employees 
         WHERE data->>'agentId' = $1`,
        [agentId]
      )

      console.log('Found employee:', rows[0]?.data)

      if (rows.length === 0) {
        throw new Error("Employee not found")
      }

      const employee = rows[0].data
      if (employee.passwordHash !== password) {
        throw new Error("Invalid password")
      }

      setUser(employee)
      localStorage.setItem("auth_token", "session-" + employee.id)
      
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem("auth_token")
  }, [])

  const value = React.useMemo(() => ({
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
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}