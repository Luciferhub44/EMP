import { defaultSettings } from '@/config/default-settings'
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./auth-context"
import { query, queryOne } from '@/lib/db'

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
        const data = await queryOne<{ settings: UserSettings }>(
          'SELECT settings FROM settings WHERE user_id = $1',
          [user.id]
        )
        
        if (data) {
          setSettings(data.settings)
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
      const result = await queryOne<{ settings: UserSettings }>(
        `INSERT INTO settings (user_id, settings)
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET settings = settings.settings || $2
         RETURNING settings`,
        [user.id, JSON.stringify(newSettings)]
      )
        
      if (result) {
        setSettings(result.settings)
      }
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
      // Update settings table
      await query(
        `UPDATE settings 
         SET settings = jsonb_set(
           settings,
           '{profile}',
           settings->'profile' || $1::jsonb
         )
         WHERE user_id = $2`,
        [JSON.stringify(profile), user.id]
      )

      // Update users table if name or email changed
      if (profile.name || profile.email) {
        await query(
          `UPDATE users 
           SET name = COALESCE($1, name),
               email = COALESCE($2, email),
               updated_at = NOW()
           WHERE id = $3`,
          [profile.name, profile.email, user.id]
        )
      }

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
  }, [user])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return

    setIsLoading(true)
    try {
      // Verify current password
      const userData = await queryOne<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      )

      if (!userData) {
        throw new Error('User not found')
      }

      // Verify password
      const { verifyPassword } = await import('@/lib/api/password')
      const isValid = await verifyPassword(currentPassword, userData.password_hash)
      if (!isValid) {
        throw new Error('Current password is incorrect')
      }

      // Hash new password
      const { hashPassword } = await import('@/lib/api/password')
      const newPasswordHash = await hashPassword(newPassword)

      // Update password
      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, user.id]
      )
    } catch (error) {
      console.error('Failed to update password:', error)
      setError('Failed to update password')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user])

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