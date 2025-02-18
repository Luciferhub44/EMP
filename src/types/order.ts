import { Product } from "./products"

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