import type { Customer } from "@/types/customer"
import { customers as mockCustomers } from "@/data/customers"
import { employeeService } from "./employee"
import { ordersService } from "./orders"

export const customerService = {
  // Get customers based on user role and access
  getCustomers: async (userId: string, isAdmin: boolean) => {
    try {
      // Admins can see all customers
      if (isAdmin) {
        return mockCustomers
      }

      // Employees can only see customers from their assigned orders
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      const customerIds = new Set(assignedOrders.map(order => order.customerId))
      
      return mockCustomers.filter(customer => customerIds.has(customer.id))
    } catch (error) {
      console.error("Failed to get customers:", error)
      return []
    }
  },

  // Get single customer with access check
  getCustomer: async (id: string, userId?: string, isAdmin?: boolean) => {
    const customer = mockCustomers.find(c => c.id === id)
    if (!customer) return null

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
  createCustomer: async (customerData: Omit<Customer, 'id'>, userId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      throw new Error("Only administrators can create customers")
    }

    const id = `CM${(mockCustomers.length + 1).toString().padStart(3, '0')}`
    const newCustomer = {
      id,
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    mockCustomers.push(newCustomer)
    return newCustomer
  },

  updateCustomer: async (
    id: string, 
    updates: Partial<Customer>,
    userId: string,
    isAdmin: boolean
  ) => {
    // Only admins can update customer details
    if (!isAdmin) {
      throw new Error("Only administrators can update customer details")
    }

    const customerIndex = mockCustomers.findIndex(c => c.id === id)
    if (customerIndex === -1) throw new Error("Customer not found")

    mockCustomers[customerIndex] = {
      ...mockCustomers[customerIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return mockCustomers[customerIndex]
  },

  getCustomerOrders: async (customerId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return ordersService.getOrders()
      .filter(order => order.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getCustomerStats: async (customerId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const customerOrders = ordersService.getOrders().filter(order => order.customerId === customerId)
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0)
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
  }
} 