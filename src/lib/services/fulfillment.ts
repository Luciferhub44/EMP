import { pool, query, queryOne, transaction } from '@/lib/db'
import type { FulfillmentDetails, FulfillmentStatus } from "@/types/orders"

interface FulfillmentUpdate {
  orderId: string
  status: FulfillmentStatus
  trackingNumber?: string
  carrierNotes?: string[]
}

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

  async updateFulfillment(update: FulfillmentUpdate): Promise<void> {
    await query(
      `UPDATE orders 
       SET 
         fulfillment_status = $1,
         tracking_number = $2,
         carrier_notes = $3
       WHERE id = $4`,
      [
        update.status,
        update.trackingNumber || null,
        update.carrierNotes ? JSON.stringify(update.carrierNotes) : null,
        update.orderId
      ]
    )
  }

  async updateStatus(
    orderId: string,
    status: FulfillmentStatus,
    note?: string,
    userId?: string,
    isAdmin?: boolean
  ) {
    return this.updateFulfillment(
      {
        orderId,
        status,
        trackingNumber: undefined,
        carrierNotes: undefined
      }
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
      {
        orderId,
        status: 'shipped',
        trackingNumber,
        carrierNotes: [`Tracking added: ${carrier} - ${trackingNumber}`]
      }
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