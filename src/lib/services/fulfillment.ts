import { pool, query, queryOne, transaction } from '@/lib/db'
import type { FulfillmentDetails, FulfillmentStatus } from "@/types/orders"

class FulfillmentService {
  async getOrderFulfillment(orderId: string, userId?: string, isAdmin?: boolean) {
    const sql = `
      SELECT f.*,
        (
          SELECT json_agg(h.*)
          FROM (
            SELECT status, timestamp, note
            FROM order_history
            WHERE order_id = f.order_id
            ORDER BY timestamp DESC
          ) h
        ) as history
      FROM fulfillments f
      INNER JOIN orders o ON o.id = f.order_id
      WHERE f.order_id = $1
      AND (o.assigned_to = $2 OR $3 = true)
    `
    return queryOne<FulfillmentDetails>(sql, [orderId, userId, isAdmin])
  }

  async createFulfillment(orderId: string, userId?: string, isAdmin?: boolean) {
    return transaction(async (client) => {
      // Verify order access
      const canAccess = await client.query(
        `SELECT 1 FROM orders
         WHERE id = $1
         AND (assigned_to = $2 OR $3 = true)`,
        [orderId, userId, isAdmin]
      )

      if (canAccess.rowCount === 0) {
        throw new Error('Access denied')
      }

      // Create fulfillment
      const result = await client.query(
        `INSERT INTO fulfillments (
          order_id,
          status,
          notes
        ) VALUES ($1, 'pending', ARRAY['Fulfillment created'])
        RETURNING *`,
        [orderId]
      )

      // Add history entry
      await client.query(
        `INSERT INTO order_history (
          order_id,
          status,
          changed_by,
          notes
        ) VALUES ($1, 'pending', $2, 'Fulfillment created')`,
        [orderId, userId]
      )

      return result.rows[0]
    })
  }

  async updateFulfillment(
    orderId: string,
    updates: Partial<FulfillmentDetails>,
    userId?: string,
    isAdmin?: boolean
  ) {
    return transaction(async (client) => {
      // Verify access
      const canAccess = await client.query(
        `SELECT 1 FROM orders
         WHERE id = $1
         AND (assigned_to = $2 OR $3 = true)`,
        [orderId, userId, isAdmin]
      )

      if (canAccess.rowCount === 0) {
        throw new Error('Access denied')
      }

      // Build update query
      const allowedUpdates = [
        'status',
        'carrier',
        'tracking_number',
        'estimated_delivery',
        'actual_delivery',
        'notes'
      ]

      const updateFields = Object.entries(updates)
        .filter(([key]) => allowedUpdates.includes(key))
        .map(([key, value]) => {
          if (key === 'notes' && Array.isArray(value)) {
            return `${key} = array_append(${key}, $${key})`
          }
          return `${key} = $${key}`
        })

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update')
      }

      const sql = `
        UPDATE fulfillments 
        SET ${updateFields.join(', ')},
            updated_at = NOW()
        WHERE order_id = $orderId
        RETURNING *
      `

      const params = {
        orderId,
        ...updates
      }

      const result = await client.query(sql, Object.values(params))

      // Add history entry if status changed
      if (updates.status) {
        await client.query(
          `INSERT INTO order_history (
            order_id,
            status,
            changed_by,
            notes
          ) VALUES ($1, $2, $3, $4)`,
          [orderId, updates.status, userId, updates.notes?.[0] || null]
        )
      }

      return result.rows[0]
    })
  }

  async updateStatus(
    orderId: string,
    status: FulfillmentStatus,
    note?: string,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.updateFulfillment(
      orderId,
      {
        status,
        notes: note ? [note] : undefined
      },
      userId,
      isAdmin
    )
  }

  async addTrackingInfo(
    orderId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.updateFulfillment(
      orderId,
      {
        carrier,
        trackingNumber,
        estimatedDelivery,
        notes: [`Tracking added: ${carrier} - ${trackingNumber}`]
      },
      userId,
      isAdmin
    )
  }

  async markAsShipped(orderId: string, userId?: string, isAdmin?: boolean) {
    const fulfillment = await this.getOrderFulfillment(orderId, userId, isAdmin)
    if (!fulfillment?.trackingNumber) {
      throw new Error("Cannot mark as shipped without tracking information")
    }

    return this.updateStatus(
      orderId,
      'shipped',
      `Order shipped via ${fulfillment.carrier || 'unknown carrier'}`,
      userId,
      isAdmin
    )
  }

  async markAsDelivered(orderId: string, userId?: string, isAdmin?: boolean) {
    await this.getOrderFulfillment(orderId, userId, isAdmin)
    
    return this.updateStatus(
      orderId,
      'delivered',
      'Order delivered successfully',
      userId,
      isAdmin
    )
  }

  async getEmployeeFulfillments(userId: string) {
    return query<FulfillmentDetails>(
      `SELECT f.*,
        (
          SELECT json_agg(h.*)
          FROM (
            SELECT status, timestamp, note
            FROM order_history
            WHERE order_id = f.order_id
            ORDER BY timestamp DESC
          ) h
        ) as history
       FROM fulfillments f
       INNER JOIN orders o ON o.id = f.order_id
       WHERE o.assigned_to = $1
       ORDER BY f.created_at DESC`,
      [userId]
    )
  }

  async getAllFulfillments(isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can view all fulfillments")
    }

    return query<FulfillmentDetails>(
      `SELECT f.*,
        (
          SELECT json_agg(h.*)
          FROM (
            SELECT status, timestamp, note
            FROM order_history
            WHERE order_id = f.order_id
            ORDER BY timestamp DESC
          ) h
        ) as history
       FROM fulfillments f
       ORDER BY f.created_at DESC`
    )
  }
}

export const fulfillmentService = new FulfillmentService()