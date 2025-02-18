import { defaultSettings } from '@/config/default-settings'
import { createContext, useContext, useState, useEffect, useCallback } from "react"
interface UserSettings {
  notifications: {
    email: boolean
    orders: boolean
    chat: boolean
  }
  appearance: {
    theme: "light" | "dark" | "system"
    compactMode: boolean
  }
  security: {
    twoFactorEnabled: boolean
  }
  profile: {
    name: string
    email: string
    company: string
  }
}

interface SettingsContextType {
  settings: UserSettings
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>
  updateProfile: (profile: Partial<UserSettings['profile']>) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings as UserSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch settings')
        }

        const data = await response.json()
        setSettings(data)
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        setError('Failed to load settings')
      }
    }

    fetchSettings()
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSettings(prev => ({
        ...prev,
        ...newSettings
      }))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (profile: Partial<UserSettings['profile']>) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSettings(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...profile
        }
      }))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Validate current password (in real app)
      if (currentPassword === "wrong") {
        throw new Error("Current password is incorrect")
      }
      // Use newPassword in password update logic
      console.log("Updating password to:", newPassword)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateProfile,
        updatePassword,
        isLoading,
        error
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
} 