import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"

export const storageService = {
  // Generic methods
  get: async <T>(key: string): Promise<T | null> => {
    const response = await fetch(`/api/storage/${key}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) return null
    return response.json()
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    const response = await fetch(`/api/storage/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(value)
    })
    if (!response.ok) throw new Error('Failed to set storage value')
  },

  // Typed methods for each data type
  getEmployees: async () => {
    const response = await fetch('/api/storage/employees', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to get employees')
    return response.json()
  },

  getOrders: async () => {
    const response = await fetch('/api/storage/orders', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to get orders')
    return response.json()
  },

  getCustomers: async () => {
    const response = await fetch('/api/storage/customers', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to get customers')
    return response.json()
  },

  getProducts: async () => {
    const response = await fetch('/api/storage/products', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to get products')
    return response.json()
  },

  // Update methods
  updateEmployees: async (employees: Employee[]) => {
    const response = await fetch('/api/storage/employees', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(employees)
    })
    if (!response.ok) throw new Error('Failed to update employees')
  },

  updateOrders: async (orders: Order[]) => {
    const response = await fetch('/api/storage/orders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(orders)
    })
    if (!response.ok) throw new Error('Failed to update orders')
  },

  updateCustomers: async (customers: Customer[]) => {
    const response = await fetch('/api/storage/customers', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(customers)
    })
    if (!response.ok) throw new Error('Failed to update customers')
  },

  updateProducts: async (products: Product[]) => {
    const response = await fetch('/api/storage/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(products)
    })
    if (!response.ok) throw new Error('Failed to update products')
  }
} 