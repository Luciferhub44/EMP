import type { Product } from "@/types/products"
import { products as mockProducts } from "@/data/products"

export const productService = {
  getProducts: async () => {
    return mockProducts
  },

  getProduct: async (id: string) => {
    const product = mockProducts.find(p => p.id === id)
    if (!product) throw new Error("Product not found")
    return product
  },

  createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `PRD${(mockProducts.length + 1).toString().padStart(3, '0')}`
    const newProduct: Product = {
      ...productData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockProducts.push(newProduct)
    return newProduct
  },

  updateProduct: async (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const index = mockProducts.findIndex(p => p.id === id)
    if (index === -1) throw new Error("Product not found")
    
    mockProducts[index] = {
      ...mockProducts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    return mockProducts[index]
  },

  deleteProduct: async (id: string) => {
    const index = mockProducts.findIndex(p => p.id === id)
    if (index === -1) throw new Error("Product not found")
    
    mockProducts.splice(index, 1)
  }
} 