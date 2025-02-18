import type { Employee } from "@/types/employee"
import { BaseService } from './base'

class AuthService extends BaseService {
  async login(agentId: string, password: string) {
    return this.post<{ token: string; user: Employee }>('/auth/login', {
      agentId,
      password
    })
  }

  async validateSession() {
    return this.get<{ user: Employee }>('/auth/session')
  }

  async logout() {
    return this.post('/auth/logout', {})
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.post<{ message: string }>('/auth/change-password', {
      oldPassword,
      newPassword
    })
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