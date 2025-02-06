import { Product } from "./product"

export type OrderStatus = 
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type PaymentStatus = "pending" | "paid" | "failed"
export type PaymentMethod = "credit_card" | "bank_transfer" | "cash"

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  product?: Product
}

export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  status: OrderStatus
  totalAmount: number
  createdAt: string
  updatedAt: string
  shippingAddress: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  notes?: string
} 