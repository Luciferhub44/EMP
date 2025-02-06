import { Badge } from "@/components/ui/badge"
import { Inventory } from "@/types"

interface StockStatusProps {
  inventory: Inventory[]
}

export function StockStatus({ inventory }: StockStatusProps) {
  const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const totalMinStock = inventory.reduce((sum, item) => sum + item.minimumStock, 0)

  if (totalStock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>
  }

  if (totalStock <= totalMinStock) {
    return <Badge variant="warning">Low Stock</Badge>
  }

  return <Badge variant="success">In Stock</Badge>
} 