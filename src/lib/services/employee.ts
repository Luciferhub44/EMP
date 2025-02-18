import { baseService } from './base'
import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"
import type { Order } from "@/types/orders"

export const employeeService = {
  // Authentication
  login: (credentials: EmployeeCredentials) =>
    baseService.handleRequest<Employee>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  // Employee management (admin only)
  createEmployee: (
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) => {
    if (!isAdmin) throw new Error("Only administrators can create employees")
    return baseService.handleRequest<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    })
  },

  getEmployees: () => 
    baseService.handleRequest<Employee[]>('/api/employees'),

  getEmployee: (id: string) =>
    baseService.handleRequest<Employee | null>(`/api/employees/${id}`),

  getEmployeeByAgentId: (agentId: string) =>
    baseService.handleRequest<Employee | null>(`/api/employees/agent/${agentId}`),

  updateEmployee: (
    id: string,
    updates: Partial<Omit<Employee, 'id' | 'createdAt'>>,
    isAdmin: boolean
  ) => {
    if (!isAdmin) throw new Error("Only administrators can update employees")
    return baseService.handleRequest<Employee>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  resetPassword: (agentId: string, newPassword: string) =>
    baseService.handleRequest<void>(`/api/employees/${agentId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    }),

  // Orders management
  getAssignedOrders: (employeeId: string) =>
    baseService.handleRequest<Order[]>(`/api/employees/${employeeId}/assigned-orders`),

  assignOrder: (orderId: string, employeeId: string) =>
    baseService.handleRequest('/api/employees/assign-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, employeeId })
    }),

  unassignOrder: (employeeId: string, orderId: string, isAdmin: boolean) => {
    if (!isAdmin) throw new Error("Only administrators can unassign orders")
    return baseService.handleRequest<void>(`/api/employees/${employeeId}/unassign-order`, {
      method: 'POST',
      body: JSON.stringify({ orderId })
    })
  },

  // Payment management
  issuePayment: (
    employeeId: string,
    paymentData: {
      type: PaymentType
      amount: number
      description: string
      reference?: string
    },
    issuerId: string,
    isAdmin: boolean
  ) => {
    if (!isAdmin) throw new Error("Only administrators can issue payments")
    return baseService.handleRequest<PaymentHistory>(`/api/employees/${employeeId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ ...paymentData, issuerId })
    })
  },

  calculateCommission: (employeeId: string, orderAmount: number) =>
    baseService.handleRequest<{ commission: number }>(`/api/employees/${employeeId}/calculate-commission`, {
      method: 'POST',
      body: JSON.stringify({ orderAmount })
    }).then(data => data.commission),

  getPaymentHistory: (employeeId: string, requesterId: string, isAdmin: boolean) =>
    baseService.handleRequest<PaymentHistory[]>(
      `/api/employees/${employeeId}/payments?requesterId=${requesterId}&isAdmin=${isAdmin}`
    ),

  getEmployeesDuePayment: (isAdmin: boolean) => {
    if (!isAdmin) throw new Error("Only administrators can view payment due information")
    return baseService.handleRequest<Employee[]>('/api/employees/due-payment')
  },

  deleteEmployee: (employeeId: string, isAdmin: boolean) => {
    if (!isAdmin) throw new Error("Only administrators can delete employees")
    return baseService.handleRequest<void>(`/api/employees/${employeeId}`, {
      method: 'DELETE'
    })
  }
} 