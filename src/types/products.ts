export type ProductStatus = 'in_stock' | 'out_of_stock' | 'discontinued'

export interface ProductSpecifications {
  [key: string]: string | number
}

export interface ProductInventory {
  warehouseId: string
  quantity: number
  minimumStock: number
}

export interface Product {
  id: string
  category: string
  name: string
  model: string
  sku: string
  description?: string
  price: number
  status: ProductStatus
  image?: string
  specifications: ProductSpecifications
  inventory: ProductInventory[]
  createdAt: string
  updatedAt: string
} 