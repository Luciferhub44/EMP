import { pool, query, queryOne, transaction } from '@/lib/db'
import type { Product } from "@/types/products"

class ProductService {
  async getProducts() {
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

  async getProduct(id: string) {
    return queryOne<Product>(
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
       WHERE p.id = $1`,
      [id]
    )
  }

  async createProduct(productData: Omit<Product, 'id' | 'inventory'>) {
    return transaction(async (client) => {
      // Create product
      const result = await client.query(
        `INSERT INTO products (
          name,
          model,
          sku,
          price,
          category,
          subcategory,
          specifications,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          productData.name,
          productData.model,
          productData.sku,
          productData.price,
          productData.category,
          productData.subCategory,
          JSON.stringify(productData.specifications),
          'active'
        ]
      )

      // Initialize inventory records for all warehouses
      const { rows: warehouses } = await client.query('SELECT id FROM warehouses')
      for (const warehouse of warehouses) {
        await client.query(
          `INSERT INTO inventory (
            product_id,
            warehouse_id,
            quantity,
            minimum_stock
          ) VALUES ($1, $2, 0, 5)`,
          [result.rows[0].id, warehouse.id]
        )
      }

      return result.rows[0]
    })
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const allowedUpdates = [
      'name',
      'model',
      'sku',
      'price',
      'category',
      'subCategory',
      'specifications',
      'status'
    ]

    const updateFields = Object.entries(updates)
      .filter(([key]) => allowedUpdates.includes(key))
      .map(([key, value]) => {
        if (key === 'specifications') {
          return `${key} = $${key}::jsonb`
        }
        return `${key} = $${key}`
      })

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

    const sql = `
      UPDATE products 
      SET ${updateFields.join(', ')},
          updated_at = NOW()
      WHERE id = $id
      RETURNING *
    `

    const params = {
      id,
      ...updates,
      specifications: updates.specifications ? JSON.stringify(updates.specifications) : undefined
    }

    return queryOne<Product>(sql, Object.values(params))
  }

  async deleteProduct(id: string, isAdmin: boolean) {
    if (!isAdmin) {
      throw new Error("Only administrators can delete products")
    }

    await transaction(async (client) => {
      // Delete inventory records first
      await client.query(
        'DELETE FROM inventory WHERE product_id = $1',
        [id]
      )

      // Delete product
      await client.query(
        'DELETE FROM products WHERE id = $1',
        [id]
      )
    })
  }

  async updateStock(productId: string, warehouseId: string, quantity: number) {
    return queryOne(
      `UPDATE inventory 
       SET quantity = $3,
           updated_at = NOW()
       WHERE product_id = $1 AND warehouse_id = $2
       RETURNING *`,
      [productId, warehouseId, quantity]
    )
  }

  async transferStock(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number
  ) {
    return transaction(async (client) => {
      // Check source stock
      const { rows: [source] } = await client.query(
        'SELECT quantity FROM inventory WHERE product_id = $1 AND warehouse_id = $2',
        [productId, fromWarehouseId]
      )

      if (!source || source.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse')
      }

      // Decrease source stock
      await client.query(
        `UPDATE inventory 
         SET quantity = quantity - $1,
             updated_at = NOW()
         WHERE product_id = $2 AND warehouse_id = $3`,
        [quantity, productId, fromWarehouseId]
      )

      // Increase destination stock
      await client.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET 
           quantity = inventory.quantity + $3,
           updated_at = NOW()`,
        [productId, toWarehouseId, quantity]
      )
    })
  }
}

export const productService = new ProductService()