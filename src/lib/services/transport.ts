import { BaseService } from './base'
import type { TransportQuote, ShippingCalculation, Order } from "@/types/orders"

const WAREHOUSE_ADDRESS = {
  street: "123 Warehouse St",
  city: "Distribution City",
  state: "DC",
  postalCode: "12345",
  country: "USA"
}

class TransportService extends BaseService {
  async calculateShipping(order: Order) {
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

    return this.post<ShippingCalculation>('/transport/calculate', {
      origin: WAREHOUSE_ADDRESS,
      destination: order.shipping.address,
      items,
      totalWeight,
      totalValue,
      requiresInsurance: totalValue > 1000
    })
  }

  async getQuotes(orderId: string) {
    return this.get<TransportQuote[]>(`/transport/quotes/${orderId}`)
  }
}

export const transportService = new TransportService() 