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
}

export interface Fulfillment {
  id: string
  orderId: string
  status: FulfillmentStatus
  items: FulfillmentItem[]
  createdAt: string
  updatedAt: string
} 