import { query, queryOne, transaction } from '@/lib/db'
import { hashPassword } from '@/lib/api/password'
import type { Employee, EmployeeCredentials, PaymentHistory, PaymentType } from "@/types/employee"
import type { Order } from "@/types/orders"

class EmployeeService {
  // Authentication
  async login(credentials: EmployeeCredentials) {
    const user = await queryOne<Employee>(
      'SELECT * FROM users WHERE agent_id = $1',
      [credentials.agentId.toUpperCase()]
    )

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Create session
    const sessionId = crypto.randomUUID()
    await query(
      'INSERT INTO user_sessions (id, user_id) VALUES ($1, $2)',
      [sessionId, user.id]
    )

    return { session: { id: sessionId }, user }
  }

  // Employee management
  async createEmployee(
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) {
    if (!isAdmin) {
      throw new Error("Only administrators can create employees")
    }

    return transaction(async (client) => {
      // Hash password
      const passwordHash = await hashPassword(employeeData.password)

      // Create employee
      const result = await client.query(
        `INSERT INTO users (
          email,
          name,
          role,
          status,
          agent_id,
          password_hash,
          business_info,
          payroll_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          employeeData.email,
          employeeData.name,
          employeeData.role,
          employeeData.status,
          employeeData.agentId,
          passwordHash,
          JSON.stringify(employeeData.businessInfo),
          JSON.stringify(employeeData.payrollInfo)
        ]
      )

      // Initialize settings
      await client.query(
        `INSERT INTO settings (user_id) VALUES ($1)`,
        [result.rows[0].id]
      )

      return result.rows[0]
    })
  }

  async getEmployees() {
    return query<Employee>(
      `SELECT * FROM users ORDER BY name`
    )
  }

  async getEmployee(id: string) {
    return queryOne<Employee>(
      `SELECT u.*, 
        (
          SELECT json_agg(o.*) 
          FROM orders o 
          WHERE o.assigned_to = u.id
        ) as assigned_orders
       FROM users u 
       WHERE u.id = $1`,
      [id]
    )
  }

  async getEmployeeByAgentId(agentId: string) {
    return queryOne<Employee>(
      'SELECT * FROM users WHERE agent_id = $1',
      [agentId.toUpperCase()]
    )
  }

  async updateEmployee(
    id: string,
    updates: Partial<Omit<Employee, 'id' | 'createdAt'>>,
    isAdmin: boolean
  ) {
    if (!isAdmin) {
      throw new Error("Only administrators can update employees")
    }

    const allowedUpdates = [
      'name',
      'email',
      'role',
      'status',
      'businessInfo',
      'payrollInfo'
    ]

    const updateFields = Object.entries(updates)
      .filter(([key]) => allowedUpdates.includes(key))
      .map(([key, value]) => {
        if (key === 'businessInfo' || key === 'payrollInfo') {
          return `${key} = $${key}::jsonb`
        }
        return `${key} = $${key}`
      })

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')},
          updated_at = NOW()
      WHERE id = $id
      RETURNING *
    `

    const params = {
      id,
      ...updates,
      businessInfo: updates.businessInfo ? JSON.stringify(updates.businessInfo) : undefined,
      payrollInfo: updates.payrollInfo ? JSON.stringify(updates.payrollInfo) : undefined
    }

    return queryOne<Employee>(sql, Object.values(params))
  }

  async resetPassword(agentId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword)
    await query(
      'UPDATE users SET password_hash = $1 WHERE agent_id = $2',
      [passwordHash, agentId.toUpperCase()]
    )
  }

  // Orders management
  async getAssignedOrders(employeeId: string): Promise<Order[]> {
    return query<Order>(
      `SELECT o.*, c.name as customer_name
       FROM orders o
       INNER JOIN customers c ON c.id = o.customer_id
       WHERE o.assigned_to = $1
       ORDER BY o.created_at DESC`,
      [employeeId]
    )
  }

  async assignOrder(orderId: string, employeeId: string) {
    await query(
      `UPDATE orders 
       SET assigned_to = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [employeeId, orderId]
    )
  }

  async unassignOrder(employeeId: string, orderId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can unassign orders")
    }

    await query(
      `UPDATE orders 
       SET assigned_to = NULL,
           updated_at = NOW()
       WHERE id = $1 AND assigned_to = $2`,
      [orderId, employeeId]
    )
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
  ): Promise<PaymentHistory> {
    if (!isAdmin) {
      throw new Error("Only administrators can issue payments")
    }

    return queryOne<PaymentHistory>(
      `INSERT INTO employee_payments (
        employee_id,
        type,
        amount,
        description,
        reference,
        issued_by,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'completed')
      RETURNING *`,
      [
        employeeId,
        paymentData.type,
        paymentData.amount,
        paymentData.description,
        paymentData.reference,
        issuerId
      ]
    )
  }

  async calculateCommission(employeeId: string, orderAmount: number) {
    const employee = await this.getEmployee(employeeId)
    if (!employee?.payrollInfo?.commissionRate) {
      return 0
    }
    return (orderAmount * employee.payrollInfo.commissionRate) / 100
  }

  async getPaymentHistory(employeeId: string, requesterId: string, isAdmin: boolean) {
    if (!isAdmin && requesterId !== employeeId) {
      throw new Error("Access denied")
    }

    return query<PaymentHistory>(
      `SELECT * FROM employee_payments
       WHERE employee_id = $1
       ORDER BY created_at DESC`,
      [employeeId]
    )
  }

  async getEmployeesDuePayment(isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can view payment due information")
    }

    return query<Employee>(
      `SELECT u.* FROM users u
       WHERE u.status = 'active'
       AND (
         SELECT MAX(created_at)
         FROM employee_payments
         WHERE employee_id = u.id
       ) < NOW() - INTERVAL '1 month'
       OR NOT EXISTS (
         SELECT 1
         FROM employee_payments
         WHERE employee_id = u.id
       )`
    )
  }

  async deleteEmployee(employeeId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can delete employees")
    }

    await transaction(async (client) => {
      // Unassign orders
      await client.query(
        'UPDATE orders SET assigned_to = NULL WHERE assigned_to = $1',
        [employeeId]
      )

      // Delete employee
      await client.query(
        'DELETE FROM users WHERE id = $1',
        [employeeId]
      )
    })
  }
}

export const employeeService = new EmployeeService()