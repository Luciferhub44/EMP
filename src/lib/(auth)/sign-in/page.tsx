import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"

export default function SignInPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState({
    agentId: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(credentials.agentId, credentials.password)
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                value={credentials.agentId}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  agentId: e.target.value
                }))}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
