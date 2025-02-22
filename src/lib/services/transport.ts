import { query, queryOne, transaction } from '@/lib/db'
import type { TransportQuote, ShippingCalculation, Order } from "@/types/orders"
import { calculateDistance } from '@/lib/utils/distance'

class TransportService {
  async getQuotes(orderId: string): Promise<TransportQuote[]> {
    return query<TransportQuote>(
      `SELECT * FROM transport_quotes
       WHERE order_id = $1
       AND status = 'pending'
       AND valid_until > NOW()
       ORDER BY cost ASC`,
      [orderId]
    )
  }

  async generateQuote(order: Order): Promise<TransportQuote> {
    if (!order.shipping?.address) {
      throw new Error("Shipping address is required")
    }

    // Get warehouse address
    const warehouse = await queryOne<{ location: string }>(
      'SELECT location FROM warehouses WHERE id = $1',
      [order.items[0]?.warehouseId || 'WH-1'] // Default to main warehouse
    )

    if (!warehouse) {
      throw new Error("Warehouse not found")
    }

    // Calculate distance
    const distance = calculateDistance(
      warehouse.location,
      order.shipping.address.street
    )

    // Calculate total weight and dimensions
    const totalWeight = order.items.reduce(
      (sum, item) => sum + ((item.weight || 1) * item.quantity),
      0
    )

    const totalValue = order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    )

    // Generate quote
    return queryOne<TransportQuote>(
      `INSERT INTO transport_quotes (
        order_id,
        provider,
        method,
        cost,
        estimated_days,
        distance,
        insurance,
        valid_until,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'pending'
      ) RETURNING *`,
      [
        order.id,
        'FastTrack Logistics', // Example provider
        totalWeight > 5000 ? 'freight' : 'standard',
        this.calculateCost(distance, totalWeight),
        this.estimateDeliveryDays(distance),
        distance,
        JSON.stringify({
          included: totalValue > 10000,
          coverage: totalValue,
          cost: totalValue > 10000 ? totalValue * 0.001 : 0
        }),
        new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
      ]
    )
  }

  async acceptQuote(quoteId: string, orderId: string): Promise<void> {
    await transaction(async (client) => {
      // Accept quote and reject others
      await client.query(
        `UPDATE transport_quotes 
         SET status = CASE
           WHEN id = $1 THEN 'accepted'
           ELSE 'rejected'
         END,
         updated_at = NOW()
         WHERE order_id = $2
         AND status = 'pending'`,
        [quoteId, orderId]
      )

      // Update order status
      await client.query(
        `UPDATE orders 
         SET status = 'processing',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      )

      // Create or update fulfillment
      await client.query(
        `INSERT INTO fulfillments (
           order_id,
           status,
           notes
         ) VALUES ($1, 'processing', ARRAY['Transport quote accepted'])
         ON CONFLICT (order_id) DO UPDATE
         SET status = 'processing',
             notes = array_append(fulfillments.notes, 'Transport quote accepted'),
             updated_at = NOW()`,
        [orderId]
      )
    })
  }

  private calculateCost(distance: number, weight: number): number {
    const baseRate = 100 // Base shipping rate
    const perKmRate = 0.5 // Cost per kilometer
    const perKgRate = 0.1 // Cost per kilogram

    const distanceCost = distance * perKmRate
    const weightCost = weight * perKgRate
    const total = baseRate + distanceCost + weightCost

    // Round to 2 decimal places
    return Math.round(total * 100) / 100
  }

  private estimateDeliveryDays(distance: number): number {
    // Basic estimation logic
    if (distance < 100) return 1
    if (distance < 500) return 2
    if (distance < 1000) return 3
    return Math.ceil(distance / 500) // 1 day per 500km
  }

  async getTransportHistory(orderId: string): Promise<TransportQuote[]> {
    return query<TransportQuote>(
      `SELECT * FROM transport_quotes
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    )
  }

  async calculateShipping(order: Order): Promise<ShippingCalculation> {
    if (!order.shipping?.address) {
      throw new Error("Shipping address is required")
    }

    // Get warehouse
    const warehouse = await queryOne<{ location: string }>(
      'SELECT location FROM warehouses WHERE id = $1',
      [order.items[0]?.warehouseId || 'WH-1']
    )

    if (!warehouse) {
      throw new Error("Warehouse not found")
    }

    // Calculate total weight and dimensions
    const items = order.items.map(item => ({
      weight: item.weight || 1,
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
      origin: {
        street: warehouse.location,
        city: "Distribution City",
        state: "DC",
        postalCode: "12345",
        country: "USA"
      },
      destination: order.shipping.address,
      items,
      totalWeight,
      totalValue,
      requiresInsurance: totalValue > 10000
    }
  }
}

export const transportService = new TransportService()