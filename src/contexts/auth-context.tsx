import * as React from "react"
import { Employee } from "@/types/employee"
import { employeeService } from "@/lib/services/employee"
import { useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/use-toast"

interface AuthContextType {
  user: Employee | null
  loading: boolean
  login: (agentId: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Employee | null>(null)
  const [loading, setLoading] = React.useState(true)
  const navigate = useNavigate()

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem("auth_user")
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as Employee
          // Verify the user session is still valid
          const employee = await employeeService.getEmployee(parsedUser.id)
          if (employee) {
            setUser(employee)
          } else {
            // Invalid session, clear it
            localStorage.removeItem("auth_user")
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        localStorage.removeItem("auth_user")
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (agentId: string, password: string) => {
    try {
      const employee = await employeeService.login({ agentId, password })
      setUser(employee)
      localStorage.setItem("auth_user", JSON.stringify(employee))
      
      // Update last login time
      const now = new Date().toISOString()
      await employeeService.updateEmployee(employee.id, { lastLogin: now })
      
      toast({
        title: "Welcome back",
        description: `Signed in as ${employee.name}`,
      })
      
      navigate("/")
    } catch (error) {
      console.error("Login failed:", error)
      toast({
        title: "Authentication failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const logout = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem("auth_user")
    toast({
      title: "Signed out",
      description: "Successfully signed out of your account",
    })
    navigate("/sign-in")
  }, [navigate])

  const value = React.useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading, logout])

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