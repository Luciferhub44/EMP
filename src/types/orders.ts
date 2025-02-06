export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed'

export type FulfillmentStatus = 
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'failed'

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  name: string
  sku: string
}

export interface ShippingDetails {
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  method: string
  cost: number
  estimatedDelivery: string
}

export interface TransportQuote {
  id: string
  provider: string
  method: string
  cost: number
  estimatedDays: number
  validUntil: string
  distance?: number
  weightBased?: boolean
  restrictions?: string[]
  insurance?: {
    included: boolean
    cost?: number
    coverage?: number
  }
}

export interface ShippingCalculation {
  origin: Address
  destination: Address
  items: {
    weight: number
    dimensions?: {
      length: number
      width: number
      height: number
    }
    quantity: number
  }[]
  totalWeight: number
  totalValue: number
  requiresInsurance?: boolean
}

export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  subtotal: number
  tax: number
  shippingCost: number
  total: number
  shipping: ShippingDetails
  notes?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface FulfillmentDetails {
  orderId: string
  status: FulfillmentStatus
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  actualDelivery?: string
  transportQuote?: TransportQuote
  notes?: string
  history: {
    status: FulfillmentStatus
    timestamp: string
    note?: string
  }[]
} 