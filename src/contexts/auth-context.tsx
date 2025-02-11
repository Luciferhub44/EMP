import * as React from "react"
import type { Employee } from "@/types/employee"

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

      // For demo, use hardcoded credentials
      if (agentId === "admin" && password === "admin123") {
        const adminUser: Employee = {
          id: "admin1",
          agentId: "admin",
          passwordHash: "admin123",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          status: "active",
          assignedOrders: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          businessInfo: {
            companyName: "Admin Corp",
            registrationNumber: "REG123",
            taxId: "TAX123",
            businessAddress: {
              street: "123 Admin St",
              city: "Admin City",
              state: "AS",
              postalCode: "12345",
              country: "USA"
            }
          },
          payrollInfo: {
            bankName: "Admin Bank",
            accountNumber: "1234567890",
            routingNumber: "987654321",
            paymentFrequency: "monthly",
            baseRate: 5000,
            currency: "USD",
            lastPaymentDate: new Date().toISOString()
          }
        }
        
        setUser(adminUser)
        localStorage.setItem("auth_token", "demo-token")
        return
      }

      throw new Error("Invalid credentials")
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