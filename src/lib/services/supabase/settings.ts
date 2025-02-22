import { supabase } from '@/lib/supabase'

export const settingsService = {
  async getUserSettings(userId: string) {
    if (!userId) return null

    const { data, error } = await supabase.rpc('get_user_settings', {
      p_user_id: userId
    })

    if (error) {
      console.error('Failed to get user settings:', error)
      return null
    }

    return data
  },

  async updateUserSettings(userId: string, settings: any) {
    if (!userId) return

    const { error } = await supabase.rpc('update_user_settings', {
      p_user_id: userId,
      p_settings: settings
    })

    if (error) {
      console.error('Failed to update user settings:', error)
      throw error
    }
  },

  async getSystemSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')

    if (error) throw error
    return data
  },

  async updateSystemSetting(key: string, value: any) {
    const { error } = await supabase
      .from('system_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (error) throw error
  }
}