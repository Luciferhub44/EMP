import type { FulfillmentDetails } from "@/types/orders"

export const fulfillments: Record<string, FulfillmentDetails> = {
  "ORD001": {
    orderId: "ORD001",
    status: "pending",
    history: [
      {
        status: "pending",
        timestamp: new Date().toISOString(),
        note: "Fulfillment created"
      }
    ]
  },
  "ORD002": {
    orderId: "ORD002",
    status: "processing",
    carrier: "FastShip",
    trackingNumber: "FSH123456789",
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Priority handling required",
    history: [
      {
        status: "pending",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Fulfillment created"
      },
      {
        status: "processing",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Order picked and packed"
      }
    ]
  }
}