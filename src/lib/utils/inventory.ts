import { Product, Warehouse } from "@/types"
import { db } from "@/lib/api/db"
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

interface InventoryAlert {
  type: 'out_of_stock' | 'low_stock'
  severity: 'high' | 'medium' | 'low'
  product: Product
  warehouse: Warehouse | undefined
  message: string
}

interface ProductWithInventory {
  id: string;
  name: string;
  minimumStock: number;
  inventory: Array<{
    warehouseId: string;
    quantity: number;
  }>;
}

// Get total stock for a product across all warehouses
export async function getTotalStock(productId: string): Promise<number> {
  const { rows } = await db.query(
    `SELECT SUM((inv->>'quantity')::int) as total 
     FROM products, jsonb_array_elements(data->'inventory') as inv 
     WHERE id = $1`,
    [productId]
  )
  return rows[0]?.total || 0
}

// Get stock level for a product in a specific warehouse
export async function getWarehouseStock(productId: string, warehouseId: string): Promise<number> {
  const { rows } = await db.query(
    `SELECT (inv->>'quantity')::int as quantity 
     FROM products, jsonb_array_elements(data->'inventory') as inv 
     WHERE id = $1 AND inv->>'warehouseId' = $2`,
    [productId, warehouseId]
  )
  return rows[0]?.quantity || 0
}

// Check if product needs restock in any warehouse
export async function needsRestocking(productId: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT EXISTS (
      SELECT 1 FROM products, jsonb_array_elements(data->'inventory') as inv 
      WHERE id = $1 AND (inv->>'quantity')::int <= (inv->>'minimumStock')::int
    ) as needs_restock`,
    [productId]
  )
  return rows[0]?.needs_restock || false
}

// Get list of products that need restocking
export async function getRestockNeededProducts(): Promise<Product[]> {
  const { rows } = await db.query(
    `SELECT DISTINCT data FROM products, jsonb_array_elements(data->'inventory') as inv 
     WHERE (inv->>'quantity')::int <= (inv->>'minimumStock')::int`
  )
  return rows.map((row: { data: any }) => row.data)
}

// Update stock level for a product in a warehouse
export async function updateStock({ productId, warehouseId, quantity }: StockUpdateParams): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: [product] } = await client.query(
      'SELECT data FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    )
    if (!product) throw new Error("Product not found")

    const inventory = product.data.inventory || []
    const existingIndex = inventory.findIndex((i: any) => i.warehouseId === warehouseId)

    if (existingIndex === -1) {
      inventory.push({
        productId,
        warehouseId,
        quantity,
        minimumStock: 0,
        lastUpdated: new Date().toISOString()
      })
    } else {
      inventory[existingIndex] = {
        ...inventory[existingIndex],
        quantity: inventory[existingIndex].quantity + quantity,
        lastUpdated: new Date().toISOString()
      }
    }

    await client.query(
      'UPDATE products SET data = jsonb_set(data, \'{inventory}\', $1::jsonb) WHERE id = $2',
      [JSON.stringify(inventory), productId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Transfer stock between warehouses
export async function transferStock({
  productId,
  fromWarehouseId,
  toWarehouseId,
  quantity
}: TransferStockParams): Promise<void> {
  const fromStock = await getWarehouseStock(productId, fromWarehouseId)
  if (fromStock < quantity) {
    throw new Error("Insufficient stock for transfer")
  }

  updateStock({
    productId,
    warehouseId: fromWarehouseId,
    quantity: fromStock - quantity
  })

  const toStock = await getWarehouseStock(productId, toWarehouseId)
  updateStock({
    productId,
    warehouseId: toWarehouseId,
    quantity: toStock + quantity
  })
}

// Get inventory alerts (low stock, out of stock)
export function getInventoryAlerts(): InventoryAlert[] {
  const alerts: InventoryAlert[] = []
  
  const productArray = Object.values(products) as unknown as ProductWithInventory[];

  for (const product of productArray) {
    for (const inv of product.inventory) {
      if (inv.quantity === 0) {
        alerts.push({
          type: 'out_of_stock',
          severity: 'high',
          product: (product as unknown) as Product,
          warehouse: warehouses.find((w: any) => w.id === inv.warehouseId),
          message: `${product.name} is out of stock in ${inv.warehouseId}`
        })
      } else if (inv.quantity <= (product as unknown as ProductWithInventory).minimumStock) {
        alerts.push({
          type: 'low_stock',
          severity: 'medium',
          product: (product as unknown) as Product,
          warehouse: warehouses.find((w: any) => w.id === inv.warehouseId),
          message: `${product.name} is running low in ${inv.warehouseId}`
        })
      }
    }
  }

  return alerts
} 