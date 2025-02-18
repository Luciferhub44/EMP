import { BaseService } from './base'
import type { Customer } from "@/types/customer"
import type { Order } from "@/types/orders"

interface CustomerStats {
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  lastOrderDate: string | null
}

class CustomerService extends BaseService {
  async getCustomers(userId: string, isAdmin: boolean) {
    return this.get<Customer[]>(`/customers?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async getCustomer(id: string, userId: string = "", isAdmin: boolean = false) {
    return this.get<Customer | null>(`/customers/${id}?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.post<Customer>('/customers', customerData)
  }

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) {
    return this.put<Customer>(`/customers/${id}`, updates)
  }

  async getCustomerOrders(customerId: string) {
    const orders = await this.get<Order[]>(`/customers/${customerId}/orders`)
    return orders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getCustomerStats(customerId: string) {
    return this.get<CustomerStats>(`/customers/${customerId}/stats`)
  }

  async deleteCustomer(customerId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can delete customers")
    }
    return this.delete<void>(`/customers/${customerId}`)
  }
}

export const customerService = new CustomerService() 