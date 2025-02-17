import type { TransportQuote, ShippingCalculation, Order } from "@/types/orders"

const WAREHOUSE_ADDRESS = {
  street: "123 Warehouse St",
  city: "Distribution City",
  state: "DC",
  postalCode: "12345",
  country: "USA"
}

export const transportService = {
  calculateShipping: (order: Order): ShippingCalculation => {
    if (!order.shipping?.address) {
      throw new Error("Shipping address is required")
    }

    // Calculate total weight and value
    const items = order.items.map(item => ({
      weight: item.weight || 1, // Default to 1kg if not specified
      quantity: item.quantity,
      dimensions: item.dimensions
    }))

    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weight * item.quantity), 
      0
    )

    const totalValue = order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    )

    return {
      origin: WAREHOUSE_ADDRESS,
      destination: order.shipping.address,
      items,
      totalWeight,
      totalValue,
      requiresInsurance: totalValue > 1000
    }
  },

  getQuotes: async (orderId: string): Promise<TransportQuote[]> => {
    try {
      const response = await fetch(`/api/transport/quotes/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transport quotes')
      }

      return response.json()
    } catch (error) {
      console.error("Failed to get transport quotes:", error)
      throw error
    }
  }
} 