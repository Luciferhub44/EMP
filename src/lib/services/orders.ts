import type { 
  Order, 
  OrderStatus, 
  TransportQuote 
} from "@/types/orders"

export const ordersService = {
  getOrders: async (userId: string, isAdmin: boolean) => {
    try {
      const response = await fetch(`/api/orders?userId=${userId}&isAdmin=${isAdmin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch orders')
      return response.json()
    } catch (error) {
      console.error("Failed to get orders:", error)
      return []
    }
  },

  getPendingOrders: async (userId: string, isAdmin: boolean) => {
    try {
      const response = await fetch(`/api/orders/pending?userId=${userId}&isAdmin=${isAdmin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch pending orders')
      return response.json()
    } catch (error) {
      console.error("Failed to get pending orders:", error)
      return []
    }
  },

  getOrder: async (id: string, userId?: string, isAdmin?: boolean) => {
    try {
      const response = await fetch(`/api/orders/${id}?userId=${userId}&isAdmin=${isAdmin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) return null
      return response.json()
    } catch (error) {
      console.error("Failed to get order:", error)
      return null
    }
  },

  updateOrder: async (id: string, updates: Partial<Order>, userId?: string, isAdmin?: boolean) => {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ updates, userId, isAdmin })
    })
    if (!response.ok) throw new Error('Failed to update order')
    return response.json()
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
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ orderData, isAdmin })
    })
    if (!response.ok) throw new Error('Failed to create order')
    return response.json()
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ status })
    })
    if (!response.ok) throw new Error('Failed to update order status')
  },

  deleteOrder: async (orderId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete orders")
    }
    
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to delete order')
  }
} 