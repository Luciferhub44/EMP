import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'

interface SignInResponse {
  session: any
  user: Employee
}

export const authService = {
  async signIn(email: string, password: string): Promise<SignInResponse> {
    try {
      // Sign in with Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Get user data
      const { data: publicUser, error: publicUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (publicUserError) {
        throw new Error('User not found')
      }

      return {
        session: data.session,
        user: publicUser as Employee
      }
    } catch (error) {
      console.error('Auth error:', error)
      throw error
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser(): Promise<Employee | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return null
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      return null
    }
  },

  async updateProfile(userId: string, updates: Partial<Employee>) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
  }
}