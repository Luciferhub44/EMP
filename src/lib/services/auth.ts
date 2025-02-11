import type { Employee } from "@/types/employee"
import { db } from "@/lib/api/db"

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const authService = {
  login: async (agentId: string, password: string) => {
    const result = await db.query(
      'SELECT data FROM employees WHERE data->\'agentId\' = $1',
      [agentId]
    )
    
    const employee = result.rows[0]?.data
    if (!employee) {
      throw new Error("Invalid credentials")
    }

    const hashedPassword = await hashPassword(password)
    if (hashedPassword !== employee.passwordHash) {
      throw new Error("Invalid credentials")
    }

    // Don't send password hash to client
    const { passwordHash, ...safeEmployee } = employee
    return safeEmployee
  },

  getEmployeeById: async (id: string) => {
    const result = await db.query('SELECT data FROM employees WHERE id = $1', [id])
    if (!result.rows[0]) {
      return null
    }
    
    const employee = result.rows[0].data
    // Don't send password hash to client
    const { passwordHash, ...safeEmployee } = employee
    return safeEmployee
  },

  register: async (
    userData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string },
    isAdmin: boolean
  ) => {
    if (!isAdmin) {
      throw new Error("Only administrators can register new employees")
    }

    // Check if agent ID already exists
    const existingResult = await db.query(
      'SELECT data FROM employees WHERE data->\'agentId\' = $1',
      [userData.agentId]
    )
    if (existingResult.rows[0]) {
      throw new Error("Agent ID already exists")
    }

    const passwordHash = await hashPassword(userData.password)
    const { password, ...employeeData } = userData

    const id = `EMP${Date.now()}`
    const now = new Date().toISOString()
    const newEmployee: Employee = {
      ...employeeData,
      id,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      assignedOrders: []
    }

    await db.query(
      'INSERT INTO employees (id, data) VALUES ($1, $2)',
      [id, newEmployee]
    )

    // Don't send password hash to client
    const { passwordHash: _, ...safeEmployee } = newEmployee
    return safeEmployee
  },

  changePassword: async (employeeId: string, oldPassword: string, newPassword: string) => {
    const result = await db.query('SELECT data FROM employees WHERE id = $1', [employeeId])
    if (!result.rows[0]) {
      throw new Error("Employee not found")
    }

    const employee = result.rows[0].data
    const hashedOldPassword = await hashPassword(oldPassword)
    if (hashedOldPassword !== employee.passwordHash) {
      throw new Error("Invalid current password")
    }

    const hashedNewPassword = await hashPassword(newPassword)
    const updatedEmployee = {
      ...employee,
      passwordHash: hashedNewPassword,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE employees SET data = $1 WHERE id = $2',
      [updatedEmployee, employeeId]
    )

    // Don't send password hash to client
    const { passwordHash: _, ...safeEmployee } = updatedEmployee
    return safeEmployee
  }
} 