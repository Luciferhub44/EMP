import { BaseService } from './base'
import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"
import type { Order } from "@/types/orders"

class EmployeeService extends BaseService {
  // Authentication
  async login(credentials: EmployeeCredentials) {
    return this.post<Employee>('/auth/login', credentials)
  }

  // Employee management (admin only)
  async createEmployee(
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) {
    if (!isAdmin) throw new Error("Only administrators can create employees")
    return this.post<Employee>('/employees', employeeData)
  }

  async getEmployees() {
    return this.get<Employee[]>('/employees')
  }

  async getEmployee(id: string) {
    return this.get<Employee | null>(`/employees/${id}`)
  }

  async getEmployeeByAgentId(agentId: string) {
    return this.get<Employee | null>(`/employees/agent/${agentId}`)
  }

  async updateEmployee(
    id: string,
    updates: Partial<Omit<Employee, 'id' | 'createdAt'>>,
    isAdmin: boolean
  ) {
    if (!isAdmin) throw new Error("Only administrators can update employees")
    return this.put<Employee>(`/employees/${id}`, updates)
  }

  async resetPassword(agentId: string, newPassword: string) {
    return this.post<void>(`/employees/${agentId}/reset-password`, { newPassword })
  }

  // Orders management
  async getAssignedOrders(employeeId: string) {
    return this.get<Order[]>(`/employees/${employeeId}/assigned-orders`)
  }

  async assignOrder(orderId: string, employeeId: string) {
    return this.post<void>(`/employees/assign-order`, { orderId, employeeId })
  }

  async unassignOrder(employeeId: string, orderId: string, isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can unassign orders")
    return this.post<void>(`/employees/${employeeId}/unassign-order`, { orderId })
  }

  // Payment management
  async issuePayment(
    employeeId: string,
    paymentData: {
      type: PaymentType
      amount: number
      description: string
      reference?: string
    },
    issuerId: string,
    isAdmin: boolean
  ) {
    if (!isAdmin) throw new Error("Only administrators can issue payments")
    return this.post<PaymentHistory>(`/employees/${employeeId}/payments`, { ...paymentData, issuerId })
  }

  async calculateCommission(employeeId: string, orderAmount: number) {
    return this.post<{ commission: number }>(`/employees/${employeeId}/calculate-commission`, { orderAmount })
      .then(data => data.commission)
  }

  async getPaymentHistory(employeeId: string, requesterId: string, isAdmin: boolean) {
    return this.get<PaymentHistory[]>(`/employees/${employeeId}/payments?requesterId=${requesterId}&isAdmin=${isAdmin}`)
  }

  async getEmployeesDuePayment(isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can view payment due information")
    return this.get<Employee[]>('/employees/due-payment')
  }

  async deleteEmployee(employeeId: string, isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can delete employees")
    return this.delete<void>(`/employees/${employeeId}`)
  }
}

export const employeeService = new EmployeeService() 