import { baseService } from './base'
import type { Product } from "@/types/products"

export const productService = {
  getProducts: () => 
    baseService.handleRequest<Product[]>('/api/products'),

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

  createProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    baseService.handleRequest<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    }),

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