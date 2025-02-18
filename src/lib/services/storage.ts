import { BaseService } from './base'
import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"

class StorageService extends BaseService {
  async getValue<T>(key: string): Promise<T | null> {
    return this.get<T | null>(`/storage/${key}`)
  }

  async set<T>(key: string, value: T) {
    return this.put<void>(`/storage/${key}`, value)
  }

  async getEmployees() {
    return this.get<Employee[]>('/storage/employees')
  }

  async getOrders() {
    return this.get<Order[]>('/storage/orders')
  }

  async getCustomers() {
    return this.get<Customer[]>('/storage/customers')
  }

  async getProducts() {
    return this.get<Product[]>('/storage/products')
  }

  async updateEmployees(employees: Employee[]) {
    return this.put<void>('/storage/employees', employees)
  }

  async updateOrders(orders: Order[]) {
    return this.put<void>('/storage/orders', orders)
  }

  async updateCustomers(customers: Customer[]) {
    return this.put<void>('/storage/customers', customers)
  }

  async updateProducts(products: Product[]) {
    return this.put<void>('/storage/products', products)
  }
}

export const storageService = new StorageService() 