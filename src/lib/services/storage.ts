import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"

// In-memory cache for development
const cache = new Map<string, any>()

export const storageService = {
  // Generic methods
  get: async <T>(key: string): Promise<T | null> => {
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      return cache.get(key) || null
    }
    
    const response = await fetch(`${import.meta.env.VITE_STORAGE_URL}/api/${key}`)
    if (!response.ok) return null
    return response.json()
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      cache.set(key, value)
      return
    }

    await fetch(`${import.meta.env.VITE_STORAGE_URL}/api/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value)
    })
  },

  // Typed methods for each data type
  getEmployees: async (): Promise<Employee[]> => {
    return (await storageService.get<Employee[]>('employees')) ?? []
  },

  getOrders: async (): Promise<Order[]> => {
    return (await storageService.get<Order[]>('orders')) ?? []
  },


  getCustomers: async (): Promise<Customer[]> => {
    return (await storageService.get<Customer[]>('customers')) ?? []
  },


  getProducts: async (): Promise<Product[]> => {
    return (await storageService.get<Product[]>('products')) ?? []
  },


  // Update methods
  updateEmployees: async (employees: Employee[]): Promise<void> => {
    await storageService.set('employees', employees)
  },

  updateOrders: async (orders: Order[]): Promise<void> => {
    await storageService.set('orders', orders)
  },

  updateCustomers: async (customers: Customer[]): Promise<void> => {
    await storageService.set('customers', customers)
  },

  updateProducts: async (products: Product[]): Promise<void> => {
    await storageService.set('products', products)
  }
} 