export interface ProductInventory {
  warehouseId: string
  quantity: number
  minimumStock: number
  lastUpdated: string
  productId: string
}

export interface Product {
  id: string
  category: string
  subCategory?: string
  name: string
  model: string
  sku: string
  description?: string
  price: number
  status: 'in_stock' | 'out_of_stock' | 'discontinued'
  image?: string
  specifications: Record<string, string | number>
  inventory: ProductInventory[]
  createdAt: string
  updatedAt: string
} 