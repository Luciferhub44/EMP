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
  model: string
  sku: string
  category: string
  subCategory?: string
  price: number
  status: string
  image?: string
  specifications: Record<string, string | number>
  inventory: Array<{
    warehouseId: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string
} 