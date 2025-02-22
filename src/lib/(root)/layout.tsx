import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { useAuth } from "@/contexts/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function RootLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // If not authenticated, redirect to sign-in
  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="container mx-auto flex-1 space-y-4 p-8 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
