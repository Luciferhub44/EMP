import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

export default function AuthLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || "/"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  // If user is already authenticated, redirect to home or previous location
  if (user) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 mr-2" />
          Equipment Management
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              Streamline your equipment management and order processing with our comprehensive solution.
            </p>
            <footer className="text-sm">Admin & Employee Portal</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
