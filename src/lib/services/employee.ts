import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"
import type { Order } from "@/types/orders"
import { orders as mockOrders } from "@/data/orders"
import { employees as mockEmployees } from "@/data/employees"

// Store employee credentials separately for security
const employeeCredentials: Record<string, string> = {
  "ADMIN001": "admin123",
  "AGT001": "agent123",
  "AGT002": "agent456"
}

export const employeeService = {
  // Authentication
  login: async (credentials: EmployeeCredentials) => {
    const storedPassword = employeeCredentials[credentials.agentId]
    if (!storedPassword || storedPassword !== credentials.password) {
      throw new Error("Invalid credentials")
    }
    
    const employee = mockEmployees.find(e => e.agentId === credentials.agentId)
    if (!employee) throw new Error("Employee not found")
    
    return employee
  },

  // Employee management (admin only)
  createEmployee: async (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'assignedOrders' | 'businessInfo' | 'payrollInfo'>, password: string) => {
    const id = `EMP${(mockEmployees.length + 1).toString().padStart(3, '0')}`
    const newEmployee = {
      ...employee,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedOrders: [] as string[]
    }
    
    mockEmployees.push(newEmployee as Employee)
    employeeCredentials[employee.agentId] = password
    
    return newEmployee
  },

  resetPassword: async (agentId: string, newPassword: string) => {
    // Check if employee exists first
    const employee = mockEmployees.find(e => e.agentId === agentId)
    if (!employee) {
      throw new Error(`Employee not found with Agent ID: ${agentId}`)
    }

    // Update password
    employeeCredentials[agentId] = newPassword

    // Update employee's updatedAt timestamp
    employee.updatedAt = new Date().toISOString()

    return {
      success: true,
      message: "Password reset successfully"
    }
  },

  getEmployees: async () => {
    return mockEmployees.filter(emp => emp.status === 'active')
  },

  getEmployee: async (id: string) => {
    const employee = mockEmployees.find(emp => emp.id === id)
    if (!employee) throw new Error(`Employee not found with ID: ${id}`)
    return employee
  },

  getEmployeeByAgentId: async (agentId: string) => {
    const employee = mockEmployees.find(emp => emp.agentId === agentId)
    if (!employee) throw new Error(`Employee not found with Agent ID: ${agentId}`)
    return employee
  },

  updateEmployee: async (id: string, updates: Partial<Employee>) => {
    const employeeIndex = mockEmployees.findIndex(e => e.id === id)
    if (employeeIndex === -1) throw new Error(`Employee not found with ID: ${id}`)
    
    mockEmployees[employeeIndex] = {
      ...mockEmployees[employeeIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return mockEmployees[employeeIndex]
  },

  getAssignedOrders: async (employeeId: string): Promise<Order[]> => {
    if (!employeeId) return []
    
    try {
      const employee = await employeeService.getEmployee(employeeId)
      return mockOrders
        .filter(order => employee.assignedOrders.includes(order.id))
        .map(order => ({
          ...order,
          paymentMethod: "credit_card",
          subtotal: order.total,
          tax: order.total * 0.1,
          shippingCost: 0,
          fulfillmentStatus: "pending"
        })) as Order[]
    } catch (error) {
      console.error("Failed to get assigned orders:", error)
      return []
    }
  },

  assignOrder: async (orderId: string, employeeId: string) => {
    const employee = mockEmployees.find(e => e.id === employeeId)
    if (!employee) throw new Error(`Employee not found with ID: ${employeeId}`)
    
    // Check if order exists in orders array
    const orderExists = mockOrders.some(o => o.id === orderId)
    if (!orderExists) throw new Error(`Order not found with ID: ${orderId}`)
    
    // Check if order is already assigned to someone else
    const currentAssignee = mockEmployees.find(e => 
      e.assignedOrders.includes(orderId)
    )
    if (currentAssignee && currentAssignee.id !== employeeId) {
      throw new Error("Order is already assigned to another employee")
    }
    
    if (!employee.assignedOrders.includes(orderId)) {
      employee.assignedOrders.push(orderId)
      employee.updatedAt = new Date().toISOString()
    }
  },

  unassignOrder: async (orderId: string, employeeId: string) => {
    const employee = mockEmployees.find(e => e.id === employeeId)
    if (!employee) throw new Error(`Employee not found with ID: ${employeeId}`)
    
    employee.assignedOrders = employee.assignedOrders.filter(id => id !== orderId)
    employee.updatedAt = new Date().toISOString()
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

    const employee = mockEmployees.find(e => e.id === employeeId)
    if (!employee) throw new Error(`Employee not found with ID: ${employeeId}`)

    const payment: PaymentHistory = {
      id: `PAY${Date.now()}`,
      employeeId,
      type: paymentData.type,
      amount: paymentData.amount,
      currency: employee.payrollInfo.currency,
      description: paymentData.description,
      status: 'completed',
      paymentDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: issuerId,
      reference: paymentData.reference
    }

    // Add to employee's payment history
    if (!employee.payrollInfo.paymentHistory) {
      employee.payrollInfo.paymentHistory = []
    }
    employee.payrollInfo.paymentHistory.push(payment)

    // Update last payment date for salary payments
    if (paymentData.type === 'salary') {
      employee.payrollInfo.lastPaymentDate = payment.paymentDate
    }

    return payment
  },

  // Calculate commission for an employee
  calculateCommission: async (employeeId: string, orderAmount: number): Promise<number> => {
    const employee = mockEmployees.find(e => e.id === employeeId)
    if (!employee) throw new Error(`Employee not found with ID: ${employeeId}`)
    
    if (!employee.payrollInfo.commissionRate) return 0

    return orderAmount * (employee.payrollInfo.commissionRate / 100)
  },

  // Get payment history for an employee
  getPaymentHistory: async (
    employeeId: string,
    requesterId: string,
    isAdmin: boolean
  ): Promise<PaymentHistory[]> => {
    // Only allow admins or the employee themselves to view payment history
    if (!isAdmin && requesterId !== employeeId) {
      throw new Error("Access denied")
    }

    const employee = mockEmployees.find(e => e.id === employeeId)
    if (!employee) throw new Error(`Employee not found with ID: ${employeeId}`)

    return employee.payrollInfo.paymentHistory || []
  },

  // Get employees due for salary payment
  getEmployeesDuePayment: async (isAdmin: boolean): Promise<Employee[]> => {
    if (!isAdmin) {
      throw new Error("Only administrators can view payment due information")
    }

    const now = new Date()
    return mockEmployees.filter(employee => {
      const lastPayment = new Date(employee.payrollInfo.lastPaymentDate)
      const daysSinceLastPayment = Math.floor(
        (now.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
      )

      switch (employee.payrollInfo.paymentFrequency) {
        case 'weekly':
          return daysSinceLastPayment >= 7
        case 'biweekly':
          return daysSinceLastPayment >= 14
        case 'monthly':
          return daysSinceLastPayment >= 30
        default:
          return false
      }
    })
  }
} 