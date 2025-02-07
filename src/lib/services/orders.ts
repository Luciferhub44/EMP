import type { Order, OrderStatus, PaymentStatus, FulfillmentStatus, TransportQuote } from "@/types/orders"
import { orders as mockOrders } from "@/data/orders"
import { employeeService } from "./employee"

export const ordersService = {
  getOrders: async (userId: string, isAdmin: boolean) => {
    try {
      // If admin, return all orders
      if (isAdmin) {
        return mockOrders
      }
      
      // If employee, return only assigned orders
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      return assignedOrders
    } catch (error) {
      console.error("Failed to get orders:", error)
      return []
    }
  },

  getPendingOrders: async (userId: string, isAdmin: boolean) => {
    try {
      const orders = await ordersService.getOrders(userId, isAdmin)
      return orders.filter(order => 
        ((order.status as OrderStatus) === 'confirmed' || (order.status as OrderStatus) === 'processing') &&
        (order.paymentStatus as PaymentStatus) === 'paid' &&
        (order.fulfillmentStatus as FulfillmentStatus) !== 'delivered'
      )
    } catch (error) {
      console.error("Failed to get pending orders:", error)
      return []
    }
  },

  getOrder: async (id: string, userId?: string, isAdmin?: boolean) => {
    const order = mockOrders.find(order => order.id === id)
    if (!order) return null

    // If admin or no user check needed, allow access
    if (isAdmin || !userId) return order

    try {
      // If employee, check if order is assigned to them
      const assignedOrders = await employeeService.getAssignedOrders(userId)
      if (!assignedOrders.find(o => o.id === id)) {
        throw new Error("Access denied")
      }
      return order
    } catch (error) {
      throw new Error("Access denied")
    }
  },

  updateOrder: async (id: string, updates: Partial<Order>, userId?: string, isAdmin?: boolean) => {
    const orderIndex = mockOrders.findIndex(order => order.id === id)
    if (orderIndex === -1) throw new Error("Order not found")
    
    // If not admin and userId provided, verify order is assigned to employee
    if (!isAdmin && userId) {
      try {
        const assignedOrders = await employeeService.getAssignedOrders(userId)
        if (!assignedOrders.find(o => o.id === id)) {
          throw new Error("Access denied")
        }
      } catch (error) {
        throw new Error("Access denied")
      }
    }

    // Prevent employees from modifying certain fields
    if (!isAdmin) {
      const restrictedFields: (keyof Order)[] = [
        'customerId',
        'items',
        'subtotal',
        'tax',
        'total',
        'paymentStatus'
      ]

      const hasRestrictedUpdates = restrictedFields.some(field => field in updates)
      if (hasRestrictedUpdates) {
        throw new Error("You don't have permission to modify these order details")
      }
    }

    mockOrders[orderIndex] = {
      ...mockOrders[orderIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    } as Order
    
    return mockOrders[orderIndex]
  },

  getTransportQuotes: async (orderId: string): Promise<TransportQuote[]> => {
    // Mock transport quotes - in real app, would call shipping APIs
    return [
      {
        id: "TQ001",
        orderId,
        carrier: "FastShip",
        price: 49.99,
        estimatedDays: 2,
        distance: 500,
        services: ["Express"],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "TQ002",
        orderId,
        carrier: "EcoShip",
        price: 29.99,
        estimatedDays: 5,
        distance: 500,
        services: ["Standard"],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "TQ003",
        orderId,
        carrier: "BulkFreight",
        price: 19.99,
        estimatedDays: 7,
        distance: 500,
        services: ["Economy"],
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  acceptTransportQuote: async (orderId: string, quoteId: string) => {
    const order = mockOrders.find(o => o.id === orderId)
    if (!order) throw new Error("Order not found")

    const quotes = await ordersService.getTransportQuotes(orderId)
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) throw new Error("Quote not found")

    // Update order with shipping details
    return ordersService.updateOrder(orderId, {
      shipping: {
        carrier: quote.carrier,
        estimatedDelivery: new Date(
          Date.now() + quote.estimatedDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        price: quote.price
      }
    })
  },

  createOrder: async (orderData: Partial<Order>, userId: string, isAdmin: boolean) => {
    // Only admins can create orders
    if (!isAdmin) {
      throw new Error("Only administrators can create orders")
    }

    const orderId = `ORD${(mockOrders.length + 1).toString().padStart(3, '0')}`
    const now = new Date().toISOString()

    const newOrder: Order = {
      id: orderId,
      ...orderData,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      // Ensure required fields have defaults
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      shipping: orderData.shipping || {},
      total: orderData.total || 0,
      items: orderData.items || []
    }

    mockOrders.push(newOrder)
    return newOrder
  }
} 