import type { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  FulfillmentStatus,
  TransportQuote 
} from "@/types/orders"
import { db } from "@/lib/api/db"

export const ordersService = {
  getOrders: async (userId: string, isAdmin: boolean) => {
    try {
      if (isAdmin) {
        const result = await db.query('SELECT data FROM orders')
        return result.rows.map((row: { data: any }) => row.data)
      }
      
      // If employee, return only assigned orders
      const result = await db.query(`
        SELECT o.data 
        FROM orders o
        JOIN employees e ON e.id = $1 
        WHERE o.id = ANY(e.data->>'assignedOrders')
      `, [userId])
      
      return result.rows.map((row: { data: any }) => row.data)
    } catch (error) {
      console.error("Failed to get orders:", error)
      return []
    }
  },

  getPendingOrders: async (userId: string, isAdmin: boolean) => {
    try {
      const orders = await ordersService.getOrders(userId, isAdmin)
      return orders.filter((order: Order) => 
        (order.status === "confirmed" || order.status === "processing") &&
        order.paymentStatus === "paid"
      )
    } catch (error) {
      console.error("Failed to get pending orders:", error)
      return []
    }
  },

  getOrder: async (id: string, userId?: string, isAdmin?: boolean) => {
    const result = await db.query('SELECT data FROM orders WHERE id = $1', [id])
    if (!result.rows[0]) return null

    const order = result.rows[0].data

    // If admin or no user check needed, allow access
    if (isAdmin || !userId) return order

    // Check if order is assigned to employee
    const employeeResult = await db.query(
      'SELECT data->\'assignedOrders\' as assigned_orders FROM employees WHERE id = $1',
      [userId]
    )
    
    if (!employeeResult.rows[0]?.assigned_orders?.includes(id)) {
      throw new Error("Access denied")
    }

    return order
  },

  updateOrder: async (id: string, updates: Partial<Order>, userId?: string, isAdmin?: boolean) => {
    const result = await db.query('SELECT data FROM orders WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Order not found")
    
    const order = result.rows[0].data

    // If not admin and userId provided, verify order is assigned to employee
    if (!isAdmin && userId) {
      try {
        const employeeResult = await db.query(
          'SELECT data->\'assignedOrders\' as assigned_orders FROM employees WHERE id = $1',
          [userId]
        )
        
        if (!employeeResult.rows[0]?.assigned_orders?.includes(id)) {
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

    const updatedOrder = {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString()
    } as Order

    await db.query(
      'UPDATE orders SET data = $1 WHERE id = $2',
      [updatedOrder, id]
    )

    return updatedOrder
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
    const order = await ordersService.getOrder(orderId)
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

    const orderId = `ORD${(await ordersService.getOrders("", true)).length.toString().padStart(3, '0')}`
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

    await db.query(
      'INSERT INTO orders (id, data) VALUES ($1, $2)',
      [orderId, newOrder]
    )

    return newOrder
  },

  updateOrderStatus: async (
    orderId: string, 
    status: OrderStatus
  ): Promise<void> => {
    const order = await ordersService.getOrder(orderId)
    if (!order) throw new Error("Order not found")

    const updatedOrder = {
      ...order,
      status: status as OrderStatus,
      updatedAt: new Date().toISOString()
    } as Order

    await db.query(
      'UPDATE orders SET data = $1 WHERE id = $2',
      [updatedOrder, orderId]
    )

    // Update payment status based on order status
    if (status === "cancelled") {
      updatedOrder.paymentStatus = "refunded" as PaymentStatus
    } else if (["delivered", "shipped"].includes(status)) {
      updatedOrder.paymentStatus = "paid" as PaymentStatus
    }

    await db.query(
      'UPDATE orders SET data = $1 WHERE id = $2',
      [updatedOrder, orderId]
    )
  },

  deleteOrder: async (orderId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete orders")
    }
    
    const result = await db.query('DELETE FROM orders WHERE id = $1', [orderId])
    if (result.rowCount === 0) throw new Error("Order not found")
  }
} 