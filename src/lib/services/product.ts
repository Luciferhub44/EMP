import type { Product } from "@/types/products"
import { BaseService } from './base'

class ProductService extends BaseService {
  async getProducts() {
    return this.get<Product[]>('/products')
  }

  async getProduct(id: string) {
    return this.get<Product | null>(`/products/${id}`)
  }

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.post<Product>('/products', productData)
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    return this.put<Product>(`/products/${id}`, updates)
  }

  async deleteProduct(productId: string, isAdmin: boolean) {
    if (!isAdmin) throw new Error("Only administrators can delete products")
    return this.delete<void>(`/products/${productId}`)
  }
}

export const productService = new ProductService() 