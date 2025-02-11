import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"
import { db } from "@/lib/db"

export const storageService = {
  // Generic methods
  get: async <T>(key: string): Promise<T | null> => {
    if (import.meta.env.VITE_NODE_ENV === 'production') {
      const result = await db.query('SELECT data FROM storage WHERE key = $1', [key])
      return result.rows[0]?.data || null
    }
    
    const response = await fetch(`${import.meta.env.VITE_STORAGE_URL}/api/${key}`)
    if (!response.ok) return null
    return response.json()
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    if (import.meta.env.VITE_NODE_ENV === 'production') {
      await db.query(
        'INSERT INTO storage (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        [key, value]
      )
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