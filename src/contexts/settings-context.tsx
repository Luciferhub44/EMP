import * as React from "react"

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
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined)

const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    orders: true,
    chat: true
  },
  appearance: {
    theme: "system",
    compactMode: false
  },
  security: {
    twoFactorEnabled: false
  },
  profile: {
    name: "John Admin",
    email: "john@example.com",
    company: "Construction Co."
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<UserSettings>(defaultSettings)
  const [isLoading, setIsLoading] = React.useState(false)

  const updateSettings = React.useCallback(async (newSettings: Partial<UserSettings>) => {
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

  const updateProfile = React.useCallback(async (profile: Partial<UserSettings['profile']>) => {
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

  const updatePassword = React.useCallback(async (currentPassword: string, newPassword: string) => {
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
        isLoading
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = React.useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
} 