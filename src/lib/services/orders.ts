import { query, queryOne, transaction } from '@/lib/db'
import type { Order, OrderStatus, TransportQuote } from "@/types/orders"

class OrderService {
  async getOrders(userId: string, isAdmin: boolean) {
    const sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      ${!isAdmin ? 'WHERE o.assigned_to = $1' : ''}
      ORDER BY o.created_at DESC
    `
    const params = !isAdmin ? [userId] : []
    return query<Order>(sql, params)
  }

  async getPendingOrders(userId: string, isAdmin: boolean) {
    const sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'pending'
      ${!isAdmin ? 'AND o.assigned_to = $1' : ''}
      ORDER BY o.created_at DESC
    `
    const params = !isAdmin ? [userId] : []
    return query<Order>(sql, params)
  }

  async getOrder(id: string, userId?: string, isAdmin?: boolean) {
    const sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
      ${!isAdmin ? 'AND o.assigned_to = $2' : ''}
    `
    const params = !isAdmin ? [id, userId] : [id]
    return queryOne<Order>(sql, params)
  }

  async createOrder(orderData: Partial<Order>, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can create orders")
    }

    return transaction(async (client) => {
      // Calculate totals
      const subtotal = orderData.items?.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      ) || 0
      const tax = subtotal * 0.1 // 10% tax rate
      const total = subtotal + tax + (orderData.shippingCost || 0)

      const result = await client.query(
        `INSERT INTO orders (
          customer_id,
          customer_name,
          items,
          status,
          payment_status,
          shipping_address,
          subtotal,
          tax,
          shipping_cost,
          total,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          orderData.customerId,
          orderData.customerName,
          JSON.stringify(orderData.items),
          'pending',
          'pending',
          JSON.stringify(orderData.shippingAddress),
          subtotal,
          tax,
          orderData.shippingCost || 0,
          total,
          orderData.notes
        ]
      )

      // Create fulfillment record
      await client.query(
        `INSERT INTO fulfillments (order_id, status)
         VALUES ($1, 'pending')`,
        [result.rows[0].id]
      )

      return result.rows[0]
    })
  }

  async updateOrder(id: string, updates: Partial<Order>, userId?: string, isAdmin?: boolean) {
    const allowedUpdates = [
      'status',
      'payment_status',
      'shipping_address',
      'notes',
      'assigned_to'
    ]

    const updateFields = Object.entries(updates)
      .filter(([key]) => allowedUpdates.includes(key))
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key} = $${key}::jsonb`
        }
        return `${key} = $${key}`
      })

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

    const sql = `
      UPDATE orders 
      SET ${updateFields.join(', ')},
          updated_at = NOW()
      WHERE id = $id
      ${!isAdmin ? 'AND assigned_to = $userId' : ''}
      RETURNING *
    `

    const params = {
      id,
      ...updates,
      ...(userId && { userId })
    }

    return queryOne<Order>(sql, Object.values(params))
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    return transaction(async (client) => {
      // Update order status
      const result = await client.query(
        `UPDATE orders 
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, orderId]
      )

      // Log status change
      await client.query(
        `INSERT INTO order_history (
          order_id,
          status,
          previous_status,
          changed_by
        ) VALUES ($1, $2, $3, $4)`,
        [
          orderId,
          status,
          result.rows[0].status,
          result.rows[0].assigned_to
        ]
      )

      return result.rows[0]
    })
  }

  async deleteOrder(orderId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can delete orders")
    }

    await query('DELETE FROM orders WHERE id = $1', [orderId])
  }

  async getTransportQuotes(orderId: string): Promise<TransportQuote[]> {
    return query<TransportQuote>(
      `SELECT * FROM transport_quotes
       WHERE order_id = $1
       AND status = 'pending'
       AND valid_until > NOW()
       ORDER BY cost ASC`,
      [orderId]
    )
  }

  async acceptTransportQuote(orderId: string, quoteId: string) {
    return transaction(async (client) => {
      // Accept quote and reject others
      await client.query(
        `UPDATE transport_quotes
         SET status = CASE
           WHEN id = $1 THEN 'accepted'
           ELSE 'rejected'
         END,
         updated_at = NOW()
         WHERE order_id = $2
         AND status = 'pending'`,
        [quoteId, orderId]
      )

      // Update order status
      await client.query(
        `UPDATE orders
         SET status = 'processing',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      )

      // Create or update fulfillment
      await client.query(
        `INSERT INTO fulfillments (
           order_id,
           status,
           notes
         ) VALUES ($1, 'processing', ARRAY['Transport quote accepted'])
         ON CONFLICT (order_id) DO UPDATE
         SET status = 'processing',
             notes = array_append(fulfillments.notes, 'Transport quote accepted'),
             updated_at = NOW()`,
        [orderId]
      )
    })
  }
}

export const ordersService = new OrderService()