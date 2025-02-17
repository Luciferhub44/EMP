import { Product, Warehouse } from "@/types"

interface StockUpdateParams {
  productId: string
  warehouseId: string
  quantity: number
}

interface TransferStockParams {
  productId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
}

interface InventoryAlert {
  type: 'out_of_stock' | 'low_stock'
  severity: 'high' | 'medium' | 'low'
  product: Product
  warehouse: Warehouse | undefined
  message: string
}

// Get total stock for a product across all warehouses
export async function getTotalStock(productId: string): Promise<number> {
  const response = await fetch(`/api/inventory/total-stock/${productId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })
  if (!response.ok) return 0
  const data = await response.json()
  return data.total || 0
}

// Get stock level for a product in a specific warehouse
export async function getWarehouseStock(productId: string, warehouseId: string): Promise<number> {
  const response = await fetch(`/api/inventory/warehouse-stock/${productId}/${warehouseId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })
  if (!response.ok) return 0
  const data = await response.json()
  return data.quantity || 0
}

// Check if product needs restock in any warehouse
export async function needsRestocking(productId: string): Promise<boolean> {
  const response = await fetch(`/api/inventory/needs-restock/${productId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })
  if (!response.ok) return false
  const data = await response.json()
  return data.needsRestock || false
}

// Get list of products that need restocking
export async function getRestockNeededProducts(): Promise<Product[]> {
  const response = await fetch('/api/inventory/restock-needed', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })
  if (!response.ok) return []
  return response.json()
}

// Update stock level for a product in a warehouse
export async function updateStock({ productId, warehouseId, quantity }: StockUpdateParams): Promise<void> {
  const response = await fetch('/api/inventory/update-stock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      productId,
      warehouseId,
      quantity
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update stock')
  }
}

// Transfer stock between warehouses
export async function transferStock({
  productId,
  fromWarehouseId,
  toWarehouseId,
  quantity
}: TransferStockParams): Promise<void> {
  const response = await fetch('/api/inventory/transfer-stock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity
    })
  })

  if (!response.ok) {
    throw new Error('Failed to transfer stock')
  }
}

// Get inventory alerts (low stock, out of stock)
export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const response = await fetch('/api/inventory/alerts', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  })
  
  if (!response.ok) {
    console.error('Failed to fetch inventory alerts')
    return []
  }
  
  return response.json()
} 