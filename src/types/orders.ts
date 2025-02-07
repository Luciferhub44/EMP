import type { Product } from "./product"

export interface Address {
  street: string
  city: string
  state: string
  country: string
  postalCode: string
}

export type OrderStatus = 
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type PaymentStatus = 
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
export type PaymentMethod = "credit_card" | "bank_transfer" | "financing" | "wire_transfer"

export type FulfillmentStatus = "pending" | "processing" | "shipped" | "delivered" | "failed"

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  product?: Product
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
  orderId: string
  carrier: string
  price: number
  estimatedDays: number
  distance: number
  services: string[]
  insurance?: {
    included: boolean
    cost?: number
  }
  validUntil: string
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
  customerName: string
  items: OrderItem[]
  status: OrderStatus
  createdAt: string
  updatedAt: string
  shippingAddress: Address
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  notes?: string
  shipping?: {
    trackingNumber?: string
    carrier?: string
    estimatedDelivery?: string
  }
  fulfillmentStatus: FulfillmentStatus
  subtotal: number
  tax: number
  total: number
  totalAmount: number
  assignedTo?: string
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