export type ProductStatus = 'in_stock' | 'out_of_stock' | 'discontinued'

export interface ProductSpecifications {
  [key: string]: string | number
}

export interface ProductInventory {
  productId: string
  warehouseId: string
  quantity: number
  minimumStock: number
  lastUpdated: string
}

export interface Product {
  id: string
  name: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  inventory: ProductInventory[]
  category: string
  model: string
  sku: string
  description?: string
  price: number
  image?: string
  specifications: ProductSpecifications
} 