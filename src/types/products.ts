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
  specifications: {
    [key: string]: string | number | undefined
  } & {
    weight?: string | number
    power?: string | number
    digDepth?: string | number
    maxReach?: string | number
    engineType?: string
    operatingWeight?: string
    bucketCapacity?: string
    capacity?: string
    dimensions?: string
    drumDiameter?: string
  }
  inventory: Array<{
    warehouseId: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string
} 

export interface ProductCategory {
  id: string
  name: string
  subCategories: string[]
}

