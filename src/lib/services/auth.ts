import type { Employee } from "@/types/employee"
import { baseService } from './base'

export const authService = {
  login: async (agentId: string, password: string) =>
    baseService.handleRequest<Employee>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ agentId, password })
    }),

  getEmployeeById: async (id: string) =>
    baseService.handleRequest<Employee | null>(`/api/employees/${id}`),

  register: async (
    userData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can register new employees")
    }
    return baseService.handleRequest<Employee>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  changePassword: async (employeeId: string, oldPassword: string, newPassword: string) =>
    baseService.handleRequest<Employee>(`/api/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ employeeId, oldPassword, newPassword })
    })
} 