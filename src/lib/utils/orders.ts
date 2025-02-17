import { Order, OrderStatus } from "@/types"

export async function getOrder(orderId: string): Promise<Order | null> {
  const response = await fetch(`/api/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })

  if (!response.ok) return null
  return response.json()
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({ status })
  })

  if (!response.ok) {
    throw new Error('Failed to update order status')
  }
}

export async function createOrder(
  orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">
): Promise<Order> {
  // Validate order data
  if (!orderData.customerId) throw new Error("Customer ID is required")
  if (!orderData.items.length) throw new Error("Order must have at least one item")
  if (!orderData.shippingAddress) throw new Error("Shipping address is required")

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(orderData)
  })

  if (!response.ok) {
    throw new Error('Failed to create order')
  }

  return response.json()
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    throw new Error('Failed to update order')
  }
}

export function getOrderStatusColor(status: OrderStatus): {
  color: string
  bgColor: string
} {
  switch (status) {
    case "pending":
      return { color: "text-yellow-700", bgColor: "bg-yellow-50" }
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