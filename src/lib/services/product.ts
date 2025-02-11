import type { Product } from "@/types/products"
import { db } from "@/lib/db"

export const productService = {
  getProducts: async () => {
    const result = await db.query('SELECT data FROM products')
    return result.rows.map(row => row.data)
  },

  getProduct: async (id: string) => {
    const result = await db.query('SELECT data FROM products WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Product not found")
    return result.rows[0].data
  },

  createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `PRD${Date.now()}`
    const now = new Date().toISOString()
    const newProduct: Product = {
      ...productData,
      id,
      createdAt: now,
      updatedAt: now
    }

    await db.query(
      'INSERT INTO products (id, data, sku, status) VALUES ($1, $2, $3, $4)',
      [id, newProduct, productData.sku, productData.status]
    )

    return newProduct
  },

  updateProduct: async (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const result = await db.query('SELECT data FROM products WHERE id = $1', [id])
    if (!result.rows[0]) throw new Error("Product not found")

    const updatedProduct = {
      ...result.rows[0].data,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await db.query(
      'UPDATE products SET data = $1, sku = $2, status = $3 WHERE id = $4',
      [updatedProduct, updates.sku, updates.status, id]
    )

    return updatedProduct
  },

  deleteProduct: async (productId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete products")
    }
    
    await db.query('DELETE FROM products WHERE id = $1', [productId])
  }
} 