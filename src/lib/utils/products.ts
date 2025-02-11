import { Product } from "@/types/products"
import { db } from "@/lib/api/db"

// Convert sync functions to async
export async function updateProductSync(productId: string, updates: Partial<Product>): Promise<Product | null> {
  const { rows: [product] } = await db.query(
    'SELECT data FROM products WHERE id = $1',
    [productId]
  )
  if (!product) return null

  const updatedProduct = {
    ...product.data,
    ...updates,
    updatedAt: new Date().toISOString()
  }

  await db.query(
    'UPDATE products SET data = $1 WHERE id = $2',
    [updatedProduct, productId]
  )

  return updatedProduct
}

export async function updateProductInventorySync(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<Product | null> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: [product] } = await client.query(
      'SELECT data FROM products WHERE id = $1',
      [productId]
    )
    if (!product) return null

    const inventory = product.data.inventory || []
    const existingIndex = inventory.findIndex((i: any) => i.warehouseId === warehouseId)

    if (existingIndex === -1) {
      inventory.push({
        productId,
        warehouseId,
        quantity,
        minimumStock: 0,
        lastUpdated: new Date().toISOString(),
      })
    } else {
      inventory[existingIndex] = {
        ...inventory[existingIndex],
        quantity,
        lastUpdated: new Date().toISOString(),
      }
    }

    const updatedProduct = {
      ...product.data,
      inventory,
      updatedAt: new Date().toISOString()
    }

    await client.query(
      'UPDATE products SET data = $1 WHERE id = $2',
      [updatedProduct, productId]
    )

    await client.query('COMMIT')
    return updatedProduct
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Async functions for API simulation
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  await db.query(
    'UPDATE products SET data = data || $1::jsonb WHERE id = $2',
    [updates, id]
  )
}

export async function createProduct(newProduct: Omit<Product, "id" | "inventory">): Promise<Product> {
  const id = `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const product = {
    id,
    ...newProduct,
    inventory: [],
    status: 'active' as const, // Fix: explicitly type the status
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await db.query(
    'INSERT INTO products (id, data) VALUES ($1, $2)',
    [id, product]
  )

  return product
}

export async function deleteProduct(id: string): Promise<void> {
  await db.query('DELETE FROM products WHERE id = $1', [id])
}

export async function updateProductInventory(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  const { rows: [product] } = await db.query(
    'SELECT data FROM products WHERE id = $1',
    [productId]
  )
  if (!product) throw new Error("Product not found")

  const inventory = product.data.inventory || []
  const existingIndex = inventory.findIndex((i: any) => i.warehouseId === warehouseId)

  if (existingIndex === -1) {
    inventory.push({
      productId,
      warehouseId,
      quantity,
      minimumStock: 0,
      lastUpdated: new Date().toISOString()
    })
  } else {
    inventory[existingIndex] = {
      ...inventory[existingIndex],
      quantity: inventory[existingIndex].quantity + quantity,
      lastUpdated: new Date().toISOString()
    }
  }

  await db.query(
    'UPDATE products SET data = jsonb_set(data, \'{inventory}\', $1::jsonb) WHERE id = $2',
    [JSON.stringify(inventory), productId]
  )
} 
