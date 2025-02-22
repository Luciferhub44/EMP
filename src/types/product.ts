export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  // ... other product fields
  inventory?: {
    warehouseId: string
    quantity: number
    minimumStock: number
  }[]
}

export interface ProductWithStock {
  product: Product
  stock: number
  needsRestock: boolean
} 