import type { FulfillmentDetails, FulfillmentStatus, Order } from "@/types/orders"
import { fulfillments } from "@/data/fulfillments"
import { ordersService } from "./orders"
import { employeeService } from "./employee"
import { fulfillmentStore } from "@/lib/utils/fulfillment"

export const fulfillmentService = {
  // Check if employee has access to the fulfillment
  checkAccess: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    if (isAdmin) return true
    if (!userId) return false

    try {
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      return assignedOrders.some((order: Order) => order.id === orderId)
    } catch (error) {
      console.error("Failed to check fulfillment access:", error)
      return false
    }
  },

  getOrderFulfillment: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) {
      throw new Error("Access denied")
    }

    // Return existing fulfillment or create new one
    const fulfillment = fulfillmentStore.get(orderId)
    if (!fulfillment) {
      return fulfillmentService.createFulfillment(orderId, userId, isAdmin)
    }
    return fulfillment
  },

  createFulfillment: async (orderId: string, userId?: string, isAdmin?: boolean) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) {
      throw new Error("Access denied")
    }

    // Check if order exists and user has access
    const order = await ordersService.getOrder(orderId, userId || '', isAdmin || false)
    if (!order) throw new Error("Order not found")

    const fulfillment: FulfillmentDetails = {
      orderId,
      status: 'pending',
      history: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: "Fulfillment created"
        }
      ]
    }

    fulfillments[orderId] = fulfillment
    return fulfillment
  },

  updateFulfillment: async (
    orderId: string, 
    updates: Partial<FulfillmentDetails>,
    userId?: string,
    isAdmin?: boolean
  ) => {
    // Check access first
    const hasAccess = await fulfillmentService.checkAccess(orderId, userId, isAdmin)
    if (!hasAccess) {
      throw new Error("Access denied")
    }

    // Verify user has access to the order
    const order = await ordersService.getOrder(orderId, userId || '', isAdmin || false)
    if (!order) throw new Error("Access denied")

    const fulfillment = fulfillments[orderId]
    if (!fulfillment) throw new Error("Fulfillment not found")

    // Add status change to history if status is updated
    if (updates.status && updates.status !== fulfillment.status) {
      fulfillment.history.push({
        status: updates.status,
        timestamp: new Date().toISOString(),
        note: updates.notes
      })

      // Also update the order's fulfillment status
      await ordersService.updateOrder(orderId, {
        fulfillmentStatus: updates.status
      }, userId, isAdmin)
    }

    // Update the fulfillment
    fulfillments[orderId] = {
      ...fulfillment,
      ...updates,
      history: fulfillment.history // Preserve history
    }

    return fulfillments[orderId]
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
    const fulfillment = await fulfillmentService.getOrderFulfillment(orderId, userId, isAdmin)
    if (!fulfillment) {
      throw new Error("Fulfillment not found")
    }
    
    return fulfillmentService.updateStatus(
      orderId,
      'delivered',
      'Order delivered successfully',
      userId,
      isAdmin
    )
  },

  // Get all fulfillments for an employee
  getEmployeeFulfillments: async (userId: string): Promise<FulfillmentDetails[]> => {
    try {
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      return assignedOrders
        .map((order: Order) => fulfillments[order.id])
        .filter(Boolean) // Remove undefined values
    } catch (error) {
      console.error("Failed to get employee fulfillments:", error)
      return []
    }
  },

  getAllFulfillments: async (): Promise<FulfillmentDetails[]> => {
    // Convert Map to array of fulfillment details
    return Array.from(fulfillmentStore.values())
  },

  getFulfillment: async (id: string): Promise<FulfillmentDetails | null> => {
    return fulfillmentStore.get(id) || null
  }
} 