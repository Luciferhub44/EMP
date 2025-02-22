import { Product } from "./products.js"

export const OrderStatus = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled"
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export type PaymentStatus = "pending" | "paid" | "failed"
export type PaymentMethod = "credit_card" | "bank_transfer" | "cash"

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  warehouseId: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed'
  items: OrderItem[]
  shippingAddress: string
  subtotal: number
  tax: number
  shippingCost: number
  total: number
  notes?: string
  createdAt: string
  updatedAt: string
} 