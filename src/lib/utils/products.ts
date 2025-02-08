import { Product } from "@/types/products"
import { products } from "@/data/products"

// Sync functions for direct updates
export function updateProductSync(productId: string, updates: Partial<Product>): Product | null {
  const productIndex = products.findIndex((p) => p.id === productId)
  if (productIndex === -1) return null

  const updatedProduct = {
    ...products[productIndex],
    ...updates,
  }

  products[productIndex] = updatedProduct
  return updatedProduct
}

export function updateProductInventorySync(
  productId: string,
  warehouseId: string,
  quantity: number
): Product | null {
  const product = products.find((p) => p.id === productId)
  if (!product) return null

  const inventoryIndex = product.inventory.findIndex(
    (i) => i.warehouseId === warehouseId
  )

  if (inventoryIndex === -1) {
    product.inventory.push({
      productId,
      warehouseId,
      quantity,
      minimumStock: 0,
      lastUpdated: new Date().toISOString(),
    })
  } else {
    product.inventory[inventoryIndex] = {
      ...product.inventory[inventoryIndex],
      quantity,
      lastUpdated: new Date().toISOString(),
    }
  }

  return product
}

// Async functions for API simulation
export async function updateProduct(id: string, updatedProduct: Partial<Product>): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = updateProductSync(id, updatedProduct)
        if (!result) {
          throw new Error("Product not found")
        }
        resolve()
      } catch (error) {
        reject(error)
      }
    }, 1000)
  })
}

export async function createProduct(newProduct: Omit<Product, "id" | "inventory">): Promise<Product> {
  return new Promise((resolve, reject) => {
    try {
      const product: Product = {
        id: `P-${Math.random().toString(36).substr(2, 9)}`,
        ...newProduct,
        inventory: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      products.push(product)
      resolve(product)
    } catch (error) {
      reject(error)
    }
  })
}

export async function deleteProduct(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const index = products.findIndex(p => p.id === id)
      if (index === -1) {
        throw new Error("Product not found")
      }
      products.splice(index, 1)
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

export async function updateProductInventory(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const result = updateProductInventorySync(productId, warehouseId, quantity)
      if (!result) {
        throw new Error("Product not found")
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
} 