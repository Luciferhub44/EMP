import { query, queryOne, transaction } from '@/lib/db'
import { BaseService } from './base'
import type { Customer } from "@/types/customer"
import type { Order } from "@/types/orders"

class CustomerService extends BaseService {
  async getCustomers(userId: string, isAdmin: boolean) {
    const sql = `
      SELECT * FROM customers
      ${!isAdmin ? `
        WHERE id IN (
          SELECT customer_id 
          FROM orders 
          WHERE assigned_to = $1
        )
      ` : ''}
      ORDER BY name
    `
    const params = !isAdmin ? [userId] : []
    return this.query<Customer>(sql, params)
  }

  async getCustomer(id: string) {
    return this.queryOne<Customer>(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    )
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.queryOne<Customer>(
      `INSERT INTO customers (
        name,
        email,
        phone,
        company,
        address
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        customerData.name,
        customerData.email,
        customerData.phone,
        customerData.company,
        JSON.stringify(customerData.address)
      ]
    )
  }

  async updateCustomer(id: string, updates: Partial<Customer>) {
    const allowedUpdates = [
      'name',
      'email',
      'phone',
      'company',
      'address'
    ]

    const updateFields = Object.entries(updates)
      .filter(([key]) => allowedUpdates.includes(key))
      .map(([key, value]) => {
        if (key === 'address') {
          return `${key} = $${key}::jsonb`
        }
        return `${key} = $${key}`
      })

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

    const sql = `
      UPDATE customers 
      SET ${updateFields.join(', ')},
          updated_at = NOW()
      WHERE id = $id
      RETURNING *
    `

    const params = {
      id,
      ...updates,
      address: updates.address ? JSON.stringify(updates.address) : undefined
    }

    return this.queryOne<Customer>(sql, Object.values(params))
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return this.query<Order>(
      `SELECT o.*, c.name as customer_name
       FROM orders o
       INNER JOIN customers c ON c.id = o.customer_id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [customerId]
    )
  }

  async getCustomerStats(customerId: string) {
    return this.queryOne<{
      totalOrders: number
      totalSpent: number
      averageOrderValue: number
      lastOrderDate: string | null
    }>(
      `SELECT 
        COUNT(*) as "totalOrders",
        COALESCE(SUM(total), 0) as "totalSpent",
        COALESCE(AVG(total), 0) as "averageOrderValue",
        MAX(created_at) as "lastOrderDate"
       FROM orders
       WHERE customer_id = $1`,
      [customerId]
    )
  }

  async deleteCustomer(customerId: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can delete customers")
    }

    await this.transaction(async (client) => {
      // Delete related orders first
      await client.query(
        'DELETE FROM orders WHERE customer_id = $1',
        [customerId]
      )

      // Delete customer
      await client.query(
        'DELETE FROM customers WHERE id = $1',
        [customerId]
      )
    })
  }
}

export const customerService = new CustomerService()