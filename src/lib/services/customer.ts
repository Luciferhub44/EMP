import type { Customer } from "@/types/customer"
import { db } from "@/lib/db"
import { employeeService } from "./employee"
import { ordersService } from "./orders"

export const customerService = {
  // Get customers based on user role and access
  getCustomers: async (userId: string, isAdmin: boolean) => {
    try {
      // Admins can see all customers
      if (isAdmin) {
        const result = await db.query('SELECT data FROM customers')
        return result.rows.map(row => row.data)
      }

      // Employees can only see customers from their assigned orders
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      const customerIds = new Set(assignedOrders.map(order => order.customerId))
      
      const result = await db.query('SELECT data FROM customers WHERE id IN ($1)', [Array.from(customerIds)])
      return result.rows.map(row => row.data)
    } catch (error) {
      console.error("Failed to get customers:", error)
      return []
    }
  },

  // Get single customer with access check
  getCustomer: async (id: string, userId: string = "", isAdmin: boolean = false) => {
    const result = await db.query('SELECT data FROM customers WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Customer not found")
    const customer = result.rows[0].data

    // Admins can access any customer
    if (isAdmin) return customer

    // If no user ID provided, return null
    if (!userId) return null

    try {
      // Check if customer is associated with any of employee's assigned orders
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      const hasAccess = assignedOrders.some(order => order.customerId === id)
      
      return hasAccess ? customer : null
    } catch (error) {
      console.error("Failed to check customer access:", error)
      return null
    }
  },

  // Only admins can create/update customers
  createCustomer: async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `CUS${Date.now()}`
    const now = new Date().toISOString()
    const newCustomer: Customer = {
      ...customerData,
      id,
      createdAt: now,
      updatedAt: now
    }

    await db.query(
      'INSERT INTO customers (id, data) VALUES ($1, $2)',
      [id, newCustomer]
    )

    return newCustomer
  },

  updateCustomer: async (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    const result = await db.query('SELECT data FROM customers WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Customer not found")

    const updatedCustomer = {
      ...result.rows[0].data,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE customers SET data = $1 WHERE id = $2',
      [updatedCustomer, id]
    )

    return updatedCustomer
  },

  getCustomerOrders: async (customerId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const orders = await ordersService.getOrders(customerId, false)
    return orders
      .filter(order => order.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getCustomerStats: async (customerId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const orders = await ordersService.getOrders(customerId, false)
    const customerOrders = orders.filter(order => order.customerId === customerId)
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0)
    const lastOrder = customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]

    return {
      orderCount: customerOrders.length,
      totalSpent,
      lastOrder,
      firstOrderDate: customerOrders.length > 0 ? 
        customerOrders[customerOrders.length - 1].createdAt : 
        null
    }
  },

  deleteCustomer: async (customerId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete customers")
    }
    
    await db.query('DELETE FROM customers WHERE id = $1', [customerId])
  }
} 