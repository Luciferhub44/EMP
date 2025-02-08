import type { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  FulfillmentStatus,
  TransportQuote 
} from "@/types/orders"
import { orders } from "@/data/orders"
import { employeeService } from "./employee"

// Update mock orders with type assertion
const mockOrders = orders.map(order => ({
  ...order,
  paymentMethod: "credit_card",
  subtotal: order.total,
  tax: order.total * 0.1,
  shippingCost: 0,
  fulfillmentStatus: "pending",
  status: order.status as OrderStatus
})) as Order[]

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
        (order.status === "confirmed" || order.status === "processing") &&
        order.paymentStatus === "paid"
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
        provider: "FastShip",
        method: "Express",
        cost: 49.99,
        estimatedDays: 2,
        distance: 500,
        weightBased: false,
        insurance: {
          included: false,
          coverage: 1000
        },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "TQ002",
        orderId,
        provider: "EcoShip",
        method: "Standard",
        cost: 29.99,
        estimatedDays: 5,
        distance: 500,
        weightBased: false,
        insurance: {
          included: false,
          coverage: 1000
        },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "TQ003",
        orderId,
        provider: "BulkFreight",
        method: "Economy",
        cost: 19.99,
        estimatedDays: 7,
        distance: 500,
        weightBased: true,
        insurance: {
          included: false,
          coverage: 1000
        },
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
        carrier: quote.provider,
        estimatedDelivery: new Date(
          Date.now() + quote.estimatedDays * 24 * 60 * 60 * 1000
        ).toISOString()
      }
    })
  },

  createOrder: async (orderData: Partial<Order>, isAdmin: boolean) => {
    // Only admins can create orders
    if (!isAdmin) {
      throw new Error("Only administrators can create orders")
    }

    const orderId = `ORD${(mockOrders.length + 1).toString().padStart(3, '0')}`
    const now = new Date().toISOString()

    const newOrder: Order = {
      id: orderId,
      ...orderData,
      status: "pending" as OrderStatus,
      paymentStatus: "pending" as PaymentStatus,
      fulfillmentStatus: "pending" as FulfillmentStatus,
      createdAt: now,
      updatedAt: now,
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      total: orderData.total || 0,
      shippingCost: orderData.shippingCost || 0,
      items: orderData.items || [],
      customerName: orderData.customerName || "",
      customerId: orderData.customerId || "",
      paymentMethod: orderData.paymentMethod || "credit_card"
    }

    mockOrders.push(newOrder)
    return newOrder
  },

  updateOrderStatus: async (
    orderId: string, 
    status: OrderStatus
  ): Promise<void> => {
    const order = mockOrders.find(o => o.id === orderId)
    if (!order) throw new Error("Order not found")

    order.status = status as OrderStatus
    order.updatedAt = new Date().toISOString()

    // Update payment status based on order status
    if (status === "cancelled") {
      order.paymentStatus = "refunded" as PaymentStatus
    } else if (["delivered", "shipped"].includes(status)) {
      order.paymentStatus = "paid" as PaymentStatus
    }
  }
} 