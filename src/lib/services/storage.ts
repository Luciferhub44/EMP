import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"
import { db } from "@/lib/api/db"

export const storageService = {
  // Generic methods
  get: async <T>(key: string): Promise<T | null> => {
    const result = await db.query('SELECT data FROM storage WHERE key = $1', [key])
    return result.rows[0]?.data || null
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    await db.query(
      'INSERT INTO storage (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
      [key, value]
    )
  },

  // Typed methods for each data type
  getEmployees: async () => {
    const result = await db.query('SELECT data FROM employees')
    return result.rows.map((row: { data: any }) => row.data)
  },

  getOrders: async () => {
    const result = await db.query('SELECT data FROM orders')
    return result.rows.map((row: { data: any }) => row.data)
  },

  getCustomers: async () => {
    const result = await db.query('SELECT data FROM customers')
    return result.rows.map((row: { data: any }) => row.data)
  },

  getProducts: async () => {
    const result = await db.query('SELECT data FROM products')
    return result.rows.map((row: { data: any })  => row.data)
  },

  // Update methods
  updateEmployees: async (employees: Employee[]) => {
    await db.query('BEGIN')
    try {
      await db.query('DELETE FROM employees')
      for (const employee of employees) {
        await db.query(
          'INSERT INTO employees (id, data) VALUES ($1, $2)',
          [employee.id, employee]
        )
      }
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  },

  updateOrders: async (orders: Order[]) => {
    await db.query('BEGIN')
    try {
      await db.query('DELETE FROM orders')
      for (const order of orders) {
        await db.query(
          'INSERT INTO orders (id, data, customer_id, status) VALUES ($1, $2, $3, $4)',
          [order.id, order, order.customerId, order.status]
        )
      }
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  },

  updateCustomers: async (customers: Customer[]) => {
    await db.query('BEGIN')
    try {
      await db.query('DELETE FROM customers')
      for (const customer of customers) {
        await db.query(
          'INSERT INTO customers (id, data) VALUES ($1, $2)',
          [customer.id, customer]
        )
      }
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  },

  updateProducts: async (products: Product[]) => {
    await db.query('BEGIN')
    try {
      await db.query('DELETE FROM products')
      for (const product of products) {
        await db.query(
          'INSERT INTO products (id, data, sku, status) VALUES ($1, $2, $3, $4)',
          [product.id, product, product.sku, product.status]
        )
      }
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  }
} 