export type ProductStatus = 'active' | 'inactive' | 'discontinued'

export interface ProductInventory {
  warehouseId: string
  quantity: number
  minimumStock: number
  lastUpdated: string
  productId: string
}

export interface Product {
  id: string
  name: string
  model: string
  sku: string
  price: number
  category: string
  subCategory?: string
  specifications: Record<string, string | number>
  inventory: ProductInventory[]
  status: ProductStatus
  createdAt: string
  updatedAt: string
  image?: string
  description?: string
} 