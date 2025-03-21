import type { Product } from "./products.js"

export interface Address {
  street: string
  city: string
  state: string
  country: string
  postalCode: string
}

export type OrderStatus = 
  | "pending"
  | "confirmed"
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

export type FulfillmentStatus = 
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed"

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  warehouseId: string
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

export interface ShippingCalculation {
  origin: Address
  destination: Address
  items: Array<{
    weight: number
    quantity: number
    dimensions?: {
      length: number
      width: number
      height: number
    }
  }>
  totalWeight: number
  totalValue: number
  requiresInsurance: boolean
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  items: OrderItem[]
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  shipping?: {
    address?: Address
    carrier?: string
    trackingNumber?: string
    estimatedDelivery?: string
  }
  subtotal: number
  tax: number
  total: number
  shippingCost: number
  createdAt: string
  updatedAt: string
  fulfillmentStatus: FulfillmentStatus
  assignedTo?: string
  notes?: string
  transportQuote?: TransportQuote
  shippingAddress?: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
}

interface FulfillmentHistoryEntry {
  status: FulfillmentStatus
  timestamp: string
  note?: string
  updatedBy?: string
}

export interface FulfillmentDetails {
  orderId: string
  status: FulfillmentStatus
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  actualDelivery?: string
  transportQuote?: string
  notes?: string
  history: FulfillmentHistoryEntry[]
}

export interface OrderFormData {
  customerId: string
  items: (OrderItem | {
    productId: string
    quantity: number
    price: number
    productName: string
  })[]
  shippingAddress: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  notes?: string
}

export interface TransportQuote {
  id: string
  orderId: string
  provider: string
  method: string
  cost: number
  estimatedDays: number
  distance: number
  insurance: {
    included: boolean
    coverage: number
    cost: number
  }
  status: 'pending' | 'accepted' | 'rejected'
  validUntil: string
}

export interface FulfillmentUpdate {
  orderId: string
  status: FulfillmentStatus
  trackingNumber?: string
  carrierNotes?: string[]
} 