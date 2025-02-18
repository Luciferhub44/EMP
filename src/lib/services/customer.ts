import { baseService } from './base'
import type { Customer } from "@/types/customer"
import type { Order } from "@/types/orders"

export const customerService = {
  // Get customers based on user role and access
  getCustomers: (userId: string, isAdmin: boolean) => 
    baseService.handleRequest<Customer[]>(`/api/customers?userId=${userId}&isAdmin=${isAdmin}`),

  // Get single customer with access check
  getCustomer: (id: string, userId: string = "", isAdmin: boolean = false) =>
    baseService.handleRequest<Customer | null>(`/api/customers/${id}?userId=${userId}&isAdmin=${isAdmin}`),

  // Only admins can create/update customers
  createCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) =>
    baseService.handleRequest<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    }),

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