import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"
import { db } from "@/lib/db"
import bcrypt from 'bcrypt'

// Store employee credentials separately for security
const employeeCredentials: Record<string, string> = {
  [import.meta.env.VITE_ADMIN_ID]: import.meta.env.VITE_ADMIN_PASSWORD,
  [import.meta.env.VITE_AGENT1_ID]: import.meta.env.VITE_AGENT1_PASSWORD,
  [import.meta.env.VITE_AGENT2_ID]: import.meta.env.VITE_AGENT2_PASSWORD
}

export const employeeService = {
  // Authentication
  login: async (credentials: EmployeeCredentials) => {
    const storedPassword = employeeCredentials[credentials.agentId]
    if (!storedPassword || storedPassword !== credentials.password) {
      throw new Error("Invalid credentials")
    }
    
    const result = await db.query(
      'SELECT data FROM employees WHERE data->\'agentId\' = $1',
      [credentials.agentId]
    )
    if (!result.rows[0]) throw new Error("Employee not found")
    
    return result.rows[0].data
  },

  // Employee management (admin only)
  createEmployee: async (
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can create employees")
    }

    const id = `EMP${Date.now()}`
    const now = new Date().toISOString()
    const newEmployee: Employee = {
      ...employeeData,
      id,
      createdAt: now,
      updatedAt: now,
      assignedOrders: employeeData.assignedOrders || [],
      passwordHash: await bcrypt.hash(employeeData.password, 10)
    }

    await db.query(
      'INSERT INTO employees (id, data) VALUES ($1, $2)',
      [id, newEmployee]
    )

    return newEmployee
  },

  resetPassword: async (agentId: string, newPassword: string) => {
    // Check if employee exists first
    const result = await db.query(
      'SELECT data FROM employees WHERE data->\'agentId\' = $1',
      [agentId]
    )
    if (!result.rows[0]) {
      throw new Error(`Employee not found with Agent ID: ${agentId}`)
    }

    // Update password
    employeeCredentials[agentId] = newPassword

    // Update employee's updatedAt timestamp
    const updatedEmployee = {
      ...result.rows[0].data,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, result.rows[0].data.id]
    )

    return {
      success: true,
      message: "Password reset successfully"
    }
  },

  getEmployees: async () => {
    const result = await db.query('SELECT data FROM employees')
    return result.rows.map(row => row.data)
  },

  getEmployee: async (id: string) => {
    const result = await db.query('SELECT data FROM employees WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Employee not found")
    return result.rows[0].data
  },

  getEmployeeByAgentId: async (agentId: string) => {
    const result = await db.query(
      'SELECT data FROM employees WHERE data->\'agentId\' = $1',
      [agentId]
    )
    if (!result.rows[0]) throw new Error(`Employee not found with Agent ID: ${agentId}`)
    return result.rows[0].data
  },

  updateEmployee: async (
    id: string, 
    updates: Partial<Omit<Employee, 'id' | 'createdAt'>>,
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can update employees")
    }

    const result = await db.query('SELECT data FROM employees WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Employee not found")

    const updatedEmployee = {
      ...result.rows[0].data,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, id]
    )

    return updatedEmployee
  },

  getAssignedOrders: async (employeeId: string) => {
    const result = await db.query(
      'SELECT o.data FROM orders o, employees e WHERE e.id = $1 AND o.id = ANY(e.data->\'assignedOrders\')',
      [employeeId]
    )
    return result.rows.map(row => row.data)
  },

  assignOrder: async (employeeId: string, orderId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can assign orders")
    }

    const result = await db.query('SELECT data FROM employees WHERE id = $1', [employeeId])
    if (!result.rows[0]) throw new Error("Employee not found")

    const employee = result.rows[0].data
    const assignedOrders = [...(employee.assignedOrders || []), orderId]

    const updatedEmployee = {
      ...employee,
      assignedOrders,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, employeeId]
    )

    return updatedEmployee
  },

  unassignOrder: async (employeeId: string, orderId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can unassign orders")
    }

    const result = await db.query('SELECT data FROM employees WHERE id = $1', [employeeId])
    if (!result.rows[0]) throw new Error("Employee not found")

    const employee = result.rows[0].data
    const assignedOrders = (employee.assignedOrders || []).filter((id: string) => id !== orderId)

    const updatedEmployee = {
      ...employee,
      assignedOrders,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, employeeId]
    )

    return updatedEmployee
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

    const result = await db.query('SELECT data FROM employees WHERE id = $1', [employeeId])
    if (!result.rows[0]) throw new Error(`Employee not found with ID: ${employeeId}`)

    const employee = result.rows[0].data
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

    // Update employee's payment history
    const updatedEmployee = {
      ...employee,
      payrollInfo: {
        ...employee.payrollInfo,
        paymentHistory: [...(employee.payrollInfo.paymentHistory || []), payment],
        lastPaymentDate: payment.paymentDate
      }
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, employeeId]
    )

    return payment
  },

  // Calculate commission for an employee
  calculateCommission: async (employeeId: string, orderAmount: number): Promise<number> => {
    const employee = await employeeService.getEmployee(employeeId)
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
    if (!isAdmin && requesterId !== employeeId) {
      throw new Error("Access denied")
    }

    const result = await db.query('SELECT data FROM employees WHERE id = $1', [employeeId])
    if (!result.rows[0]) throw new Error(`Employee not found with ID: ${employeeId}`)

    return result.rows[0].data.payrollInfo.paymentHistory || []
  },

  // Get employees due for salary payment
  getEmployeesDuePayment: async (isAdmin: boolean): Promise<Employee[]> => {
    if (!isAdmin) {
      throw new Error("Only administrators can view payment due information")
    }

    const now = new Date()
    const result = await db.query('SELECT data FROM employees')
    
    return result.rows.map(row => row.data).filter(employee => {
      const lastPayment = new Date(employee.payrollInfo.lastPaymentDate)
      const daysSinceLastPayment = Math.floor(
        (now.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
      )

      switch (employee.payrollInfo.paymentFrequency) {
        case 'weekly': return daysSinceLastPayment >= 7
        case 'biweekly': return daysSinceLastPayment >= 14
        case 'monthly': return daysSinceLastPayment >= 30
        default: return false
      }
    })
  },

  deleteEmployee: async (employeeId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete employees")
    }
    
    await db.query('DELETE FROM employees WHERE id = $1', [employeeId])
  }
} 