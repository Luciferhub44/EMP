export interface Warehouse {
  id: string
  name: string
  location: string
  capacity: number
  status: 'active' | 'inactive'
}

export interface StockLevel {
  productId: string
  warehouseId: string
  quantity: number
  minimumStock: number
} 