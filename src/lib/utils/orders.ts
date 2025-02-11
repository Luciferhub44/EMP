import { Order, OrderStatus } from "@/types"
import { db } from "@/lib/api/db"
//import { updateStock } from "./inventory"

export async function getOrder(orderId: string): Promise<Order | null> {
  const { rows: [order] } = await db.query(
    'SELECT data FROM orders WHERE id = $1',
    [orderId]
  )
  if (!order) return null

  // Attach product details
  const { rows: products } = await db.query(
    'SELECT data FROM products WHERE id = ANY($1)',
    [order.data.items.map((item: any) => item.productId)]
  )

  return {
    ...order.data,
    items: order.data.items.map((item: any) => ({
      ...item,
      product: products.find((p: { id: string }) => p.id === item.productId)?.data
    }))
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      'UPDATE orders SET data = jsonb_set(data, \'{status}\', $1::text::jsonb) WHERE id = $2',
      [JSON.stringify(status), orderId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function createOrder(
  orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">
): Promise<Order> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const now = new Date().toISOString()
    const order: Order = {
      ...orderData,
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }

    // Validate order data
    if (!order.customerId) throw new Error("Customer ID is required")
    if (!order.items.length) throw new Error("Order must have at least one item")
    if (!order.shippingAddress) throw new Error("Shipping address is required")

    await client.query(
      'INSERT INTO orders (id, data, customer_id, status) VALUES ($1, $2, $3, $4)',
      [order.id, order, order.customerId, order.status]
    )

    await client.query('COMMIT')
    return order
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      'UPDATE orders SET data = jsonb_set(data, $1, $2) WHERE id = $3',
      [JSON.stringify(updates), updates, orderId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
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