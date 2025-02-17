import type { Product } from "@/types/products"

export const productService = {
  getProducts: async () => {
    try {
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch products')
      return response.json()
    } catch (error) {
      console.error("Failed to get products:", error)
      return []
    }
  },

  getProduct: async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) throw new Error('Product not found')
      return response.json()
    } catch (error) {
      console.error("Failed to get product:", error)
      return null
    }
  },

  createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(productData)
    })
    if (!response.ok) throw new Error('Failed to create product')
    return response.json()
  },

  updateProduct: async (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update product')
    return response.json()
  },

  deleteProduct: async (productId: string, isAdmin: boolean): Promise<void> => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete products")
    }
    
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })
    if (!response.ok) throw new Error('Failed to delete product')
  }
} 