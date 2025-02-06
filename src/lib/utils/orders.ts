import { Order, OrderStatus } from "@/types"
import { orders } from "@/data/orders"
import { products } from "@/data/products"
import { updateProductInventory } from "./products"

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const order = orders.find(o => o.id === orderId)
    if (!order) return null

    // Attach product details to order items
    return {
      ...order,
      items: order.items.map(item => ({
        ...item,
        product: products.find(p => p.id === item.productId)
      }))
    }
  } catch (error) {
    console.error('Error getting order:', error)
    throw new Error('Failed to get order')
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus
): Promise<void> {
  try {
    const order = orders.find(o => o.id === orderId)
    if (!order) throw new Error("Order not found")

    order.status = status
    order.updatedAt = new Date().toISOString()

    // Handle inventory updates based on status
    if (status === "confirmed") {
      // Reserve inventory
      for (const item of order.items) {
        await updateProductInventory(
          item.productId,
          "wh-1", // Default warehouse
          -item.quantity // Decrease inventory
        )
      }
    } else if (status === "cancelled" && order.status === "confirmed") {
      // Return inventory if cancelling a confirmed order
      for (const item of order.items) {
        await updateProductInventory(
          item.productId,
          "wh-1",
          item.quantity // Increase inventory
        )
      }
    }
  } catch (error) {
    console.error('Error updating order status:', error)
    throw new Error('Failed to update order status')
  }
}

export async function createOrder(
  orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">
): Promise<Order> {
  try {
    const now = new Date().toISOString()
    const order: Order = {
      ...orderData,
      id: `ORD-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }

    // Validate order data
    if (!order.customerId) throw new Error("Customer ID is required")
    if (!order.items.length) throw new Error("Order must have at least one item")
    if (!order.shippingAddress) throw new Error("Shipping address is required")

    orders.push(order)
    return order
  } catch (error) {
    console.error('Error creating order:', error)
    throw new Error('Failed to create order')
  }
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const order = orders.find(o => o.id === orderId)
  if (!order) throw new Error("Order not found")

  Object.assign(order, {
    ...updates,
    updatedAt: new Date().toISOString()
  })
}

export function getOrderStatusColor(status: OrderStatus): {
  color: string
  bgColor: string
} {
  switch (status) {
    case "pending":
      return { color: "text-yellow-700", bgColor: "bg-yellow-50" }
    case "confirmed":
      return { color: "text-blue-700", bgColor: "bg-blue-50" }
    case "processing":
      return { color: "text-purple-700", bgColor: "bg-purple-50" }
    case "shipped":
      return { color: "text-indigo-700", bgColor: "bg-indigo-50" }
    case "delivered":
      return { color: "text-green-700", bgColor: "bg-green-50" }
    case "cancelled":
      return { color: "text-red-700", bgColor: "bg-red-50" }
    default:
      return { color: "text-gray-700", bgColor: "bg-gray-50" }
  }
} 