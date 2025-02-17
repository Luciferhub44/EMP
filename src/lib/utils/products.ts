import { Product } from "@/types/products"

// Convert sync functions to async
export async function updateProductSync(productId: string, updates: Partial<Product>): Promise<Product | null> {
  const response = await fetch(`/api/products/${productId}/sync`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) return null
  return response.json()
}

export async function updateProductInventorySync(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<Product | null> {
  const response = await fetch(`/api/products/${productId}/inventory/sync`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      warehouseId,
      quantity
    })
  })

  if (!response.ok) return null
  return response.json()
}

// Async functions for API simulation
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    throw new Error('Failed to update product')
  }
}

export async function createProduct(newProduct: Omit<Product, "id" | "inventory">): Promise<Product> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify(newProduct)
  })

  if (!response.ok) {
    throw new Error('Failed to create product')
  }

  return response.json()
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to delete product')
  }
}

export async function updateProductInventory(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  const response = await fetch(`/api/products/${productId}/inventory`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      warehouseId,
      quantity
    })
  })

  if (!response.ok) {
    throw new Error('Failed to update product inventory')
  }
} 
