import type { Customer } from "@/types/customer"
import type { Order } from "@/types/orders"

export const customerService = {
  // Get customers based on user role and access
  getCustomers: async (userId: string, isAdmin: boolean) => {
    try {
      const response = await fetch(`/api/customers?userId=${userId}&isAdmin=${isAdmin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch customers')
      return response.json()
    } catch (error) {
      console.error("Failed to get customers:", error)
      return []
    }
  },

  // Get single customer with access check
  getCustomer: async (id: string, userId: string = "", isAdmin: boolean = false) => {
    try {
      const response = await fetch(`/api/customers/${id}?userId=${userId}&isAdmin=${isAdmin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) return null
      return response.json()
    } catch (error) {
      console.error("Failed to get customer:", error)
      return null
    }
  },

  // Only admins can create/update customers
  createCustomer: async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(customerData)
    })
    if (!response.ok) throw new Error('Failed to create customer')
    return response.json()
  },

  updateCustomer: async (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update customer')
    return response.json()
  },

  getCustomerOrders: async (customerId: string) => {
    const response = await fetch(`/api/customers/${customerId}/orders`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) return []
    const orders = await response.json()
    return orders.sort((a: Order, b: Order) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  getCustomerStats: async (customerId: string) => {
    const response = await fetch(`/api/customers/${customerId}/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to fetch customer stats')
    return response.json()
  },

  deleteCustomer: async (customerId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete customers")
    }
    
    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to delete customer')
  }
} 