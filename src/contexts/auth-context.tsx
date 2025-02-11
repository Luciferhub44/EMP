import * as React from "react"
import { Employee } from "@/types/employee"
import { authService } from "@/lib/services/auth"
import { sessionService } from "@/lib/services/session"
import { auditService } from "@/lib/services/audit"
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
        const token = localStorage.getItem("auth_token")
        if (token) {
          // Verify the session is still valid
          const session = await sessionService.getSession(token)
          if (session) {
            // Get the user data
            const employee = await authService.getEmployeeById(session.userId)
            if (employee) {
              setUser(employee)
            } else {
              // Invalid session, clear it
              localStorage.removeItem("auth_token")
              await sessionService.deleteSession(token)
            }
          } else {
            // Session expired or invalid, clear it
            localStorage.removeItem("auth_token")
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        localStorage.removeItem("auth_token")
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (agentId: string, password: string) => {
    try {
      // Authenticate user
      const employee = await authService.login(agentId, password)
      
      // Create a new session
      const token = crypto.randomUUID()
      await sessionService.createSession(employee.id, token)
      
      // Store token and user data
      localStorage.setItem("auth_token", token)
      setUser(employee)
      
      // Log the successful login
      await auditService.log("login", employee.id, {
        timestamp: new Date().toISOString(),
        agentId: employee.agentId
      })
      
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

  const logout = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (token) {
        await sessionService.deleteSession(token)
      }
      if (user) {
        await auditService.log("logout", user.id, {
          timestamp: new Date().toISOString(),
          agentId: user.agentId
        })
      }
      setUser(null)
      localStorage.removeItem("auth_token")
      toast({
        title: "Signed out",
        description: "Successfully signed out of your account",
      })
      navigate("/sign-in")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }, [navigate, user])

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