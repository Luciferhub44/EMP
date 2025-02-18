import type { Employee } from "@/types/employee"
import { BaseService } from './base'

class AuthService extends BaseService {
  async login(agentId: string, password: string) {
    try {
      return await this.post<{ token: string; user: Employee }>('/auth/login', {
        agentId: agentId.toUpperCase(),
        password
      })
    } catch (error) {
      this.handleError(error, 'Invalid credentials')
      throw error
    }
  }

  async validateSession() {
    try {
      return await this.get<{ user: Employee }>('/auth/session')
    } catch (error) {
      this.handleError(error, 'Session validation failed')
      throw error
    }
  }

  async logout() {
    try {
      await this.post('/auth/logout', {})
      this.handleSuccess('Logged out successfully')
    } catch (error) {
      this.handleError(error, 'Logout failed')
      throw error
    }
  }

  async changePassword(oldPassword: string, newPassword: string) {
    try {
      const result = await this.post<{ message: string }>('/auth/change-password', {
        oldPassword,
        newPassword
      })
      this.handleSuccess(result.message)
      return result
    } catch (error) {
      this.handleError(error, 'Password change failed')
      throw error
    }
  }

  async getEmployeeById(id: string) {
    return this.get<Employee | null>(`/employees/${id}`)
  }

  async register(
    userData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) {
    if (!isAdmin) {
      throw new Error("Only administrators can register new employees")
    }
    return this.post<Employee>('/auth/register', userData)
  }
}

export const authService = new AuthService() 