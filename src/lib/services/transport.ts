import type { TransportQuote, ShippingCalculation, Order } from "@/types/orders"
import { calculateDistance, calculateShippingCost } from "@/lib/utils/shipping"
import { ordersService } from "./orders"
import { db } from "@/lib/api/db"

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
      requiresInsurance: totalValue > 1000 // Require insurance for high-value orders
    }
  },

  getQuotes: async (orderId: string): Promise<TransportQuote[]> => {
    try {
      // Check if quotes exist in database
      const existingQuotes = await db.query(
        'SELECT data FROM transport_quotes WHERE data->\'orderId\' = $1',
        [orderId]
      )

      if (existingQuotes.rows.length > 0) {
        const quotes = existingQuotes.rows.map(row => row.data)
        // Check if quotes are still valid
        if (new Date(quotes[0].validUntil) > new Date()) {
          return quotes
        }
      }

      const order = await ordersService.getOrder(orderId)
      if (!order) throw new Error("Order not found")

      const shipping = transportService.calculateShipping(order as unknown as Order)
      const distance = await calculateDistance(shipping.origin, shipping.destination)

      const quotes = [
        {
          id: `quote-${Date.now()}-express`,
          orderId,
          provider: "FastShip",
          method: "Express",
          cost: calculateShippingCost({
            distance,
            weight: shipping.totalWeight,
            baseRate: 49.99,
            ratePerKm: 0.5,
            ratePerKg: 2
          }),
          estimatedDays: Math.ceil(distance / 500),
          distance,
          weightBased: true,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          insurance: {
            included: true,
            coverage: shipping.totalValue
          }
        },
        {
          id: "standard",
          orderId,
          provider: "EcoShip",
          method: "Standard",
          cost: calculateShippingCost({
            distance,
            weight: shipping.totalWeight,
            baseRate: 29.99,
            ratePerKm: 0.3,
            ratePerKg: 1
          }),
          estimatedDays: Math.ceil(distance / 300),
          distance,
          weightBased: true,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          insurance: {
            included: false,
            cost: shipping.totalValue * 0.01
          }
        },
        {
          id: "economy",
          orderId,
          provider: "BulkFreight",
          method: "Economy",
          cost: calculateShippingCost({
            distance,
            weight: shipping.totalWeight,
            baseRate: 19.99,
            ratePerKm: 0.2,
            ratePerKg: 0.5
          }),
          estimatedDays: Math.ceil(distance / 200), // 200km per day
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          distance,
          weightBased: true,
          insurance: {
            included: false,
            cost: shipping.totalValue * 0.015
          }
        }
      ]

      // Store quotes in database
      await Promise.all(quotes.map(quote => 
        db.query(
          'INSERT INTO transport_quotes (id, data) VALUES ($1, $2)',
          [quote.id, quote]
        )
      ))

      return quotes
    } catch (error) {
      console.error("Failed to get transport quotes:", error)
      throw error
    }
  }
} 