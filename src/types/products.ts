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
  category: string
  name: string
  model: string
  sku: string
  price: number
  status: string
  image: string
  specifications: {
    weight?: number
    power?: number
    digDepth?: number
    maxReach?: number
    engineType?: string
    operatingWeight?: string
    bucketCapacity?: string
    liftingCapacity?: string
    maxHeight?: string
    boomLength?: string
    drumDiameter?: string
    [key: string]: string | number | undefined
  }
  inventory: Array<{
    warehouseId: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string
} 