import type { Order, OrderStatus, TransportQuote } from "@/types/orders"
import { BaseService } from './base'

class OrdersService extends BaseService {
  async getOrders(userId: string, isAdmin: boolean) {
    return this.get<Order[]>(`/orders?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async getPendingOrders(userId: string, isAdmin: boolean) {
    return this.get<Order[]>(`/orders/pending?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async getOrder(id: string, userId?: string, isAdmin?: boolean) {
    return this.get<Order | null>(`/orders/${id}?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async updateOrder(id: string, updates: Partial<Order>, userId?: string, isAdmin?: boolean) {
    return this.put<Order>(`/orders/${id}`, { updates, userId, isAdmin })
  }

  async getTransportQuotes(orderId: string): Promise<TransportQuote[]> {
    return this.get<TransportQuote[]>(`/orders/${orderId}/transport-quotes`)
  }

  async acceptTransportQuote(orderId: string, quoteId: string) {
    const order = await this.getOrder(orderId)
    if (!order) throw new Error("Order not found")

    const quotes = await this.getTransportQuotes(orderId)
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) throw new Error("Quote not found")

    return this.updateOrder(orderId, {
      shipping: {
        carrier: quote.provider,
        estimatedDelivery: new Date(
          Date.now() + quote.estimatedDays * 24 * 60 * 60 * 1000
        ).toISOString()
      }
    })
  }

  async createOrder(orderData: Partial<Order>, isAdmin: boolean) {
    return this.post<Order>('/orders', { orderData, isAdmin })
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return this.put<void>(`/orders/${orderId}/status`, { status })
  }

  async deleteOrder(orderId: string, isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can delete orders")
    return this.delete<void>(`/orders/${orderId}`)
  }
}

export const ordersService = new OrdersService() 