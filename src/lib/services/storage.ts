import { baseService } from './base'
import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"

export const storageService = {
  // Generic methods
  get: <T>(key: string) =>
    baseService.handleRequest<T | null>(`/api/storage/${key}`),

  set: <T>(key: string, value: T) =>
    baseService.handleRequest<void>(`/api/storage/${key}`, {
      method: 'PUT',
      body: JSON.stringify(value)
    }),

  // Typed methods for each data type
  getEmployees: () =>
    baseService.handleRequest<Employee[]>('/api/storage/employees'),

  getOrders: () =>
    baseService.handleRequest<Order[]>('/api/storage/orders'),

  getCustomers: () =>
    baseService.handleRequest<Customer[]>('/api/storage/customers'),

  getProducts: () =>
    baseService.handleRequest<Product[]>('/api/storage/products'),

  // Update methods
  updateEmployees: (employees: Employee[]) =>
    baseService.handleRequest<void>('/api/storage/employees', {
      method: 'PUT',
      body: JSON.stringify(employees)
    }),

  updateOrders: (orders: Order[]) =>
    baseService.handleRequest<void>('/api/storage/orders', {
      method: 'PUT',
      body: JSON.stringify(orders)
    }),

  updateCustomers: (customers: Customer[]) =>
    baseService.handleRequest<void>('/api/storage/customers', {
      method: 'PUT',
      body: JSON.stringify(customers)
    }),

  updateProducts: (products: Product[]) =>
    baseService.handleRequest<void>('/api/storage/products', {
      method: 'PUT',
      body: JSON.stringify(products)
    })
} 