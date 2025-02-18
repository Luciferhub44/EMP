import type { FulfillmentDetails, FulfillmentStatus } from "@/types/orders"
import { ordersService } from "./orders"
import { employeeService } from "./employee"
import { baseService } from './base'

export const fulfillmentService = {
  // Check if employee has access to the fulfillment
  checkAccess: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    if (isAdmin) return true
    if (!userId) return false

    try {
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      return assignedOrders.some(order => order.id === orderId)
    } catch (error) {
      console.error("Failed to check fulfillment access:", error)
      return false
    }
  },

  getOrderFulfillment: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) throw new Error("Access denied")

    return baseService.handleRequest<FulfillmentDetails>(`/api/fulfillments/${orderId}`)
  },

  createFulfillment: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) throw new Error("Access denied")

    // Check if order exists
    const order = await ordersService.getOrder(orderId, userId || '', isAdmin || false)
    if (!order) throw new Error("Order not found")

    return baseService.handleRequest<FulfillmentDetails>('/api/fulfillments', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    })
  },

  updateFulfillment: async (
    orderId: string, 
    updates: Partial<FulfillmentDetails>,
    userId?: string,
    isAdmin?: boolean
  ) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) throw new Error("Access denied")

    return baseService.handleRequest<FulfillmentDetails>(`/api/fulfillments/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  updateStatus: async (
    orderId: string,
    status: FulfillmentStatus,
    note?: string,
    userId?: string,
    isAdmin?: boolean
  ) => {
    return fulfillmentService.updateFulfillment(
      orderId,
      { status, notes: note },
      userId,
      isAdmin
    )
  },

  addTrackingInfo: async (
    orderId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    userId?: string,
    isAdmin?: boolean
  ) => {
    return fulfillmentService.updateFulfillment(
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
  },

  markAsShipped: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    const fulfillment = await fulfillmentService.getOrderFulfillment(orderId, userId, isAdmin)
    if (!fulfillment?.trackingNumber) {
      throw new Error("Cannot mark as shipped without tracking information")
    }

    return fulfillmentService.updateStatus(
      orderId,
      'shipped',
      `Order shipped via ${fulfillment.carrier || 'unknown carrier'}`,
      userId,
      isAdmin
    )
  },

  markAsDelivered: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    await fulfillmentService.getOrderFulfillment(orderId, userId, isAdmin)
    
    return fulfillmentService.updateStatus(
      orderId,
      'delivered',
      'Order delivered successfully',
      userId,
      isAdmin
    )
  },

  getEmployeeFulfillments: async (userId: string) => {
    const assignedOrders = await employeeService.getAssignedOrders(userId)
    return baseService.handleRequest<FulfillmentDetails[]>('/api/fulfillments/batch', {
      method: 'POST',
      body: JSON.stringify({ orderIds: assignedOrders.map(order => order.id) })
    })
  },

  getAllFulfillments: () => 
    baseService.handleRequest<FulfillmentDetails[]>('/api/fulfillments'),

  getFulfillment: (id: string) =>
    baseService.handleRequest<FulfillmentDetails | null>(`/api/fulfillments/${id}`)
} 