export type FulfillmentStatus = 
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export interface FulfillmentItem {
  id: string
  name: string
  quantity: number
  status: FulfillmentStatus
  weight: number
  dimensions: {
    length: number
    width: number
    height: number
  }
}

export interface Fulfillment {
  id: string
  orderId: string
  status: FulfillmentStatus
  items: FulfillmentItem[]
  createdAt: string
  updatedAt: string
}

export interface FulfillmentDetails {
  orderId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  assignedTo?: string
  transportQuoteId: string
  trackingNumber: string
  carrier: string
  estimatedDelivery: string
  actualDelivery: string
  notes?: string[]
  createdAt: string
  updatedAt: string
  weightBased: boolean
  insurance: {
    included: boolean
    coverage: number
  }
} 