import { pool, query, queryOne } from '@/lib/db'
import type { Employee } from "@/types/employee"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"

class StorageService {
  async getValue<T>(key: string): Promise<T | null> {
    return queryOne<T>(
      'SELECT value FROM storage WHERE key = $1',
      [key]
    )
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    await pool.query(
      `INSERT INTO storage (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE
       SET value = $2`,
      [key, JSON.stringify(value)]
    )
  }

  async getEmployees(): Promise<Employee[]> {
    return query<Employee>(
      'SELECT * FROM users ORDER BY name'
    )
  }

  async getOrders(): Promise<Order[]> {
    return query<Order>(
      `SELECT o.*, c.name as customer_name
       FROM orders o
       INNER JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC`
    )
  }

  async getCustomers(): Promise<Customer[]> {
    return query<Customer>(
      'SELECT * FROM customers ORDER BY name'
    )
  }

  async getProducts(): Promise<Product[]> {
    return query<Product>(
      `SELECT p.*, 
        (
          SELECT json_agg(json_build_object(
            'warehouseId', i.warehouse_id,
            'quantity', i.quantity,
            'minimumStock', i.minimum_stock
          ))
          FROM inventory i
          WHERE i.product_id = p.id
        ) as inventory
       FROM products p
       ORDER BY p.name`
    )
  }

  async updateEmployees(employees: Employee[]): Promise<void> {
    await pool.query('BEGIN')
    try {
      // Clear existing employees
      await pool.query('DELETE FROM users')

      // Insert new employees
      for (const employee of employees) {
        await pool.query(
          `INSERT INTO users (
            id,
            email,
            name,
            role,
            status,
            agent_id,
            business_info,
            payroll_info
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            employee.id,
            employee.email,
            employee.name,
            employee.role,
            employee.status,
            employee.agentId,
            JSON.stringify(employee.businessInfo),
            JSON.stringify(employee.payrollInfo)
          ]
        )
      }

      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

  async updateOrders(orders: Order[]): Promise<void> {
    await pool.query('BEGIN')
    try {
      // Clear existing orders
      await pool.query('DELETE FROM orders')

      // Insert new orders
      for (const order of orders) {
        await pool.query(
          `INSERT INTO orders (
            id,
            customer_id,
            customer_name,
            status,
            payment_status,
            items,
            shipping_address,
            subtotal,
            tax,
            shipping_cost,
            total,
            notes,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            order.id,
            order.customerId,
            order.customerName,
            order.status,
            order.paymentStatus,
            JSON.stringify(order.items),
            JSON.stringify(order.shippingAddress),
            order.subtotal,
            order.tax,
            order.shippingCost,
            order.total,
            order.notes,
            order.createdAt,
            order.updatedAt
          ]
        )
      }

      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

  async updateCustomers(customers: Customer[]): Promise<void> {
    await pool.query('BEGIN')
    try {
      // Clear existing customers
      await pool.query('DELETE FROM customers')

      // Insert new customers
      for (const customer of customers) {
        await pool.query(
          `INSERT INTO customers (
            id,
            name,
            email,
            phone,
            company,
            address
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            customer.company,
            JSON.stringify(customer.address)
          ]
        )
      }

      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

  async updateProducts(products: Product[]): Promise<void> {
    await pool.query('BEGIN')
    try {
      // Clear existing products and inventory
      await pool.query('DELETE FROM inventory')
      await pool.query('DELETE FROM products')

      // Insert new products
      for (const product of products) {
        // Insert product
        await pool.query(
          `INSERT INTO products (
            id,
            name,
            model,
            sku,
            price,
            category,
            subcategory,
            specifications,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            product.id,
            product.name,
            product.model,
            product.sku,
            product.price,
            product.category,
            product.subCategory,
            JSON.stringify(product.specifications),
            'active'
          ]
        )

        // Insert inventory records
        if (product.inventory) {
          for (const inv of product.inventory) {
            await pool.query(
              `INSERT INTO inventory (
                product_id,
                warehouse_id,
                quantity,
                minimum_stock
              ) VALUES ($1, $2, $3, $4)`,
              [
                product.id,
                inv.warehouseId,
                inv.quantity,
                inv.minimumStock
              ]
            )
          }
        }
      }

      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }
}

export const storageService = new StorageService()