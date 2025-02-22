import { defaultSettings } from '@/config/default-settings'
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { settingsService } from '@/lib/services/supabase/settings'
import { useAuth } from "./auth-context"
import { supabase } from "@/lib/supabase"
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
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchSettings = async () => {
      try {
        const data = await settingsService.getUserSettings(user.id)
        if (data) {
          setSettings(data)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setError('Failed to load settings')
      }
    }

    fetchSettings()
  }, [user])

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user) return

    setIsLoading(true)
    try {
      await settingsService.updateUserSettings(user.id, newSettings)
      setSettings(prev => ({
        ...prev,
        ...newSettings
      }))
    } catch (error) {
      console.error('Failed to update settings:', error)
      setError('Failed to update settings')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const updateProfile = useCallback(async (profile: Partial<UserSettings['profile']>) => {
    if (!user) return

    setIsLoading(true)
    try {
      await settingsService.updateUserSettings(user.id, {
        profile: {
          ...settings.profile,
          ...profile
        }
      })
      setSettings(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...profile
        }
      }))
    } catch (error) {
      console.error('Failed to update profile:', error)
      setError('Failed to update profile')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, settings.profile])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
    } catch (error) {
      console.error('Failed to update password:', error)
      setError('Failed to update password')
      throw error
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