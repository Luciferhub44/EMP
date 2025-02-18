import type { FulfillmentDetails, FulfillmentStatus } from "@/types/orders"
import { BaseService } from './base'

class FulfillmentService extends BaseService {
  async getOrderFulfillment(orderId: string, userId?: string, isAdmin?: boolean) {
    return this.get<FulfillmentDetails>(`/fulfillments/${orderId}?userId=${userId}&isAdmin=${isAdmin}`)
  }

  async createFulfillment(orderId: string, userId?: string, isAdmin?: boolean) {
    return this.post<FulfillmentDetails>('/fulfillments', { 
      orderId,
      userId,
      isAdmin 
    })
  }

  async updateFulfillment(
    orderId: string, 
    updates: Partial<FulfillmentDetails>,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.put<FulfillmentDetails>(`/fulfillments/${orderId}`, {
      ...updates,
      userId,
      isAdmin
    })
  }

  async updateStatus(
    orderId: string,
    status: FulfillmentStatus,
    note?: string,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.updateFulfillment(
      orderId,
      { status, notes: note },
      userId,
      isAdmin
    )
  }

  async addTrackingInfo(
    orderId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.updateFulfillment(
      orderId,
      {
        carrier,
        trackingNumber,
        estimatedDelivery,
        notes: `Tracking added: ${carrier} - ${trackingNumber}`
      },
      userId,
      isAdmin
    )
  }

  async markAsShipped(orderId: string, userId?: string, isAdmin?: boolean) {
    const fulfillment = await this.getOrderFulfillment(orderId, userId, isAdmin)
    if (!fulfillment?.trackingNumber) {
      throw new Error("Cannot mark as shipped without tracking information")
    }

    return this.updateStatus(
      orderId,
      'shipped',
      `Order shipped via ${fulfillment.carrier || 'unknown carrier'}`,
      userId,
      isAdmin
    )
  }

  async markAsDelivered(orderId: string, userId?: string, isAdmin?: boolean) {
    await this.getOrderFulfillment(orderId, userId, isAdmin)
    
    return this.updateStatus(
      orderId,
      'delivered',
      'Order delivered successfully',
      userId,
      isAdmin
    )
  }

  async getEmployeeFulfillments(userId: string) {
    return this.get<FulfillmentDetails[]>(`/fulfillments?userId=${userId}`)
  }

  async getAllFulfillments(isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can view all fulfillments")
    return this.get<FulfillmentDetails[]>('/fulfillments')
  }
}

export const fulfillmentService = new FulfillmentService() 