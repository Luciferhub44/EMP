import { supabase } from '@/lib/supabase'
import type { Employee, EmployeeCredentials } from "@/types/employee"
import { hashPassword, verifyPassword } from './password'

interface ApiError extends Error {
  status?: number;
  code?: string;
}

const handleError = (error: unknown) => {
  console.error('API Error:', error)
  throw error
}

export const api = {
  async get<T>(endpoint: string, token?: string) {
    try {
      const { data, error } = await supabase
        .from(endpoint)
        .select('*')

      if (error) {
        throw error
      }

      return data as T
    } catch (error) {
      handleError(error)
    }
  },

  async post<T>(endpoint: string, data: unknown, token?: string) {
    try {
      const { data: result, error } = await supabase
        .from(endpoint)
        .insert(data)
        .select()
        .single()

      if (error) {
        throw error
      }

      return result as T
    } catch (error) {
      handleError(error)
    }
  },

  auth: {
    async login(credentials: EmployeeCredentials) {
      try {
        // Get user by agent ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('agent_id', credentials.agentId.toUpperCase())
          .single()

        if (userError || !user) {
          throw new Error('Invalid credentials')
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        // Sign in with Supabase auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: credentials.password
        })

        if (authError) {
          throw authError
        }

        return {
          session: authData.session,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            agentId: user.agentId,
            status: user.status
          }
        }
      } catch (error) {
        handleError(error)
      }
    },

    async validateSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (!session) {
          throw new Error('No active session')
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userError) throw userError

        return { user }
      } catch (error) {
        handleError(error)
      }
    },

    async logout() {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      } catch (error) {
        handleError(error)
      }
    }
  }
}