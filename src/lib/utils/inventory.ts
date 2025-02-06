import { Product, Inventory } from "@/types"
import { products } from "@/data/products"
import { warehouses } from "@/data/warehouses"

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

// Get total stock for a product across all warehouses
export function getTotalStock(productId: string): number {
  const product = products.find(p => p.id === productId)
  if (!product) return 0

  return product.inventory.reduce((total, inv) => total + inv.quantity, 0)
}

// Get stock level for a product in a specific warehouse
export function getWarehouseStock(productId: string, warehouseId: string): number {
  const product = products.find(p => p.id === productId)
  if (!product) return 0

  const inventory = product.inventory.find(inv => inv.warehouseId === warehouseId)
  return inventory?.quantity || 0
}

// Check if product needs restock in any warehouse
export function needsRestock(productId: string): boolean {
  const product = products.find(p => p.id === productId)
  if (!product) return false

  return product.inventory.some(inv => 
    inv.quantity <= inv.minimumStock
  )
}

// Get list of products that need restocking
export function getRestockNeededProducts(): Product[] {
  return products.filter(product => needsRestock(product.id))
}

// Update stock level for a product in a warehouse
export function updateStock({ productId, warehouseId, quantity }: StockUpdateParams): void {
  const product = products.find(p => p.id === productId)
  if (!product) throw new Error("Product not found")

  const inventory = product.inventory.find(inv => inv.warehouseId === warehouseId)
  if (!inventory) {
    // Create new inventory record if it doesn't exist
    product.inventory.push({
      productId,
      warehouseId,
      quantity,
      minimumStock: 1,
      lastUpdated: new Date().toISOString()
    })
  } else {
    // Update existing inventory
    inventory.quantity = quantity
    inventory.lastUpdated = new Date().toISOString()
  }
}

// Transfer stock between warehouses
export function transferStock({
  productId,
  fromWarehouseId,
  toWarehouseId,
  quantity
}: TransferStockParams): void {
  const fromStock = getWarehouseStock(productId, fromWarehouseId)
  if (fromStock < quantity) {
    throw new Error("Insufficient stock for transfer")
  }

  updateStock({
    productId,
    warehouseId: fromWarehouseId,
    quantity: fromStock - quantity
  })

  const toStock = getWarehouseStock(productId, toWarehouseId)
  updateStock({
    productId,
    warehouseId: toWarehouseId,
    quantity: toStock + quantity
  })
}

// Get inventory alerts (low stock, out of stock)
export function getInventoryAlerts() {
  const alerts = []
  
  for (const product of products) {
    for (const inv of product.inventory) {
      if (inv.quantity === 0) {
        alerts.push({
          type: 'out_of_stock',
          severity: 'high',
          product,
          warehouse: warehouses.find(w => w.id === inv.warehouseId),
          message: `${product.name} is out of stock in ${inv.warehouseId}`
        })
      } else if (inv.quantity <= inv.minimumStock) {
        alerts.push({
          type: 'low_stock',
          severity: 'medium',
          product,
          warehouse: warehouses.find(w => w.id === inv.warehouseId),
          message: `${product.name} is running low in ${inv.warehouseId}`
        })
      }
    }
  }

  return alerts
} 