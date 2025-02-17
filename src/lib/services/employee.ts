import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"


export const employeeService = {
  // Authentication
  login: async (credentials: EmployeeCredentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      throw new Error('Invalid credentials')
    }

    return response.json()
  },

  // Employee management (admin only)
  createEmployee: async (
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can create employees")
    }

    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(employeeData)
    })

    if (!response.ok) {
      throw new Error('Failed to create employee')
    }

    return response.json()
  },

  resetPassword: async (agentId: string, newPassword: string) => {
    const response = await fetch(`/api/employees/${agentId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ newPassword })
    })

    if (!response.ok) {
      throw new Error('Failed to reset password')
    }

    return response.json()
  },

  getEmployees: async () => {
    const response = await fetch('/api/employees', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch employees')
    }

    return response.json()
  },

  getEmployee: async (id: string) => {
    const response = await fetch(`/api/employees/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  },

  getEmployeeByAgentId: async (agentId: string) => {
    const response = await fetch(`/api/employees/agent/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  },

  updateEmployee: async (
    id: string, 
    updates: Partial<Omit<Employee, 'id' | 'createdAt'>>,
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can update employees")
    }

    const response = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update employee')
    }

    return response.json()
  },

  getAssignedOrders: async (employeeId: string) => {
    const response = await fetch(`/api/employees/${employeeId}/assigned-orders`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch assigned orders')
    }

    return response.json()
  },

  assignOrder: async (employeeId: string, orderId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can assign orders")
    }

    const response = await fetch(`/api/employees/${employeeId}/assign-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ orderId })
    })

    if (!response.ok) {
      throw new Error('Failed to assign order')
    }

    return response.json()
  },

  unassignOrder: async (employeeId: string, orderId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can unassign orders")
    }

    const response = await fetch(`/api/employees/${employeeId}/unassign-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ orderId })
    })

    if (!response.ok) {
      throw new Error('Failed to unassign order')
    }

    return response.json()
  },

  // Issue a payment to an employee
  issuePayment: async (
    employeeId: string,
    paymentData: {
      type: PaymentType
      amount: number
      description: string
      reference?: string
    },
    issuerId: string,
    isAdmin: boolean
  ): Promise<PaymentHistory> => {
    if (!isAdmin) {
      throw new Error("Only administrators can issue payments")
    }

    const response = await fetch(`/api/employees/${employeeId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        ...paymentData,
        issuerId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to issue payment')
    }

    return response.json()
  },

  // Calculate commission for an employee
  calculateCommission: async (employeeId: string, orderAmount: number): Promise<number> => {
    const response = await fetch(`/api/employees/${employeeId}/calculate-commission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ orderAmount })
    })

    if (!response.ok) {
      throw new Error('Failed to calculate commission')
    }

    const { commission } = await response.json()
    return commission
  },

  // Get payment history for an employee
  getPaymentHistory: async (
    employeeId: string,
    requesterId: string,
    isAdmin: boolean
  ): Promise<PaymentHistory[]> => {
    const response = await fetch(
      `/api/employees/${employeeId}/payments?requesterId=${requesterId}&isAdmin=${isAdmin}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch payment history')
    }

    return response.json()
  },

  // Get employees due for salary payment
  getEmployeesDuePayment: async (isAdmin: boolean): Promise<Employee[]> => {
    if (!isAdmin) {
      throw new Error("Only administrators can view payment due information")
    }

    const response = await fetch('/api/employees/due-payment', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch employees due payment')
    }

    return response.json()
  },

  deleteEmployee: async (employeeId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete employees")
    }
    
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete employee')
    }
  }
} 