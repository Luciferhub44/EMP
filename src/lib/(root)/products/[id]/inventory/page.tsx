import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { db } from "@/lib/db"
import { updateStock, transferStock, getWarehouseStock } from "@/lib/utils/inventory"
import { ArrowRight } from "lucide-react"
import { Product, Warehouse } from "@/types"

export default function ProductInventoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([])
  const [loading, setLoading] = React.useState(true)

  const [selectedWarehouse, setSelectedWarehouse] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [transferData, setTransferData] = React.useState({
    fromWarehouse: "",
    toWarehouse: "",
    quantity: "",
  })

  // Add state for warehouse stocks
  const [warehouseStocks, setWarehouseStocks] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    async function loadData() {
      try {
        // Load product
        const { rows: [productRow] } = await db.query(
          'SELECT data FROM products WHERE id = $1',
          [id]
        )
        setProduct(productRow?.data || null)

        // Load warehouses
        const { rows: warehouseRows } = await db.query('SELECT data FROM warehouses')
        setWarehouses(warehouseRows.map(row => row.data))

        // Load warehouse stocks
        const stocks: Record<string, number> = {}
        for (const warehouse of warehouseRows) {
          stocks[warehouse.data.id] = await getWarehouseStock(id!, warehouse.data.id)
        }
        setWarehouseStocks(stocks)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    )
  }

  const handleUpdateStock = async () => {
    try {
      await updateStock({
        productId: product.id,
        warehouseId: selectedWarehouse,
        quantity: parseInt(quantity),
      })
      alert("Stock updated successfully!")
      setSelectedWarehouse("")
      setQuantity("")
    } catch (error) {
      alert("Failed to update stock. Please try again.")
    }
  }

  const handleTransferStock = async () => {
    try {
      await transferStock({
        productId: product.id,
        fromWarehouseId: transferData.fromWarehouse,
        toWarehouseId: transferData.toWarehouse,
        quantity: parseInt(transferData.quantity),
      })
      alert("Stock transferred successfully!")
      setTransferData({
        fromWarehouse: "",
        toWarehouse: "",
        quantity: "",
      })
    } catch (error) {
      alert("Failed to transfer stock. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Inventory</h2>
          <p className="text-muted-foreground">
            {product.name} • {product.model}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/products/${id}`)}>
          Back to Product
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Update Stock</CardTitle>
            <CardDescription>Update stock level in a warehouse</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Warehouse</Label>
              <Select
                value={selectedWarehouse}
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <Button
              onClick={handleUpdateStock}
              disabled={!selectedWarehouse || !quantity}
            >
              Update Stock
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer Stock</CardTitle>
            <CardDescription>Transfer stock between warehouses</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>From Warehouse</Label>
              <Select
                value={transferData.fromWarehouse}
                onValueChange={(value) => 
                  setTransferData(prev => ({ ...prev, fromWarehouse: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouseStocks[warehouse.id] || 0} units)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="grid gap-2">
              <Label>To Warehouse</Label>
              <Select
                value={transferData.toWarehouse}
                onValueChange={(value) => 
                  setTransferData(prev => ({ ...prev, toWarehouse: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem 
                      key={warehouse.id} 
                      value={warehouse.id}
                      disabled={warehouse.id === transferData.fromWarehouse}
                    >
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Quantity to Transfer</Label>
              <Input
                type="number"
                min="1"
                max={transferData.fromWarehouse ? 
                  warehouseStocks[transferData.fromWarehouse] || 0 : 
                  undefined
                }
                value={transferData.quantity}
                onChange={(e) => 
                  setTransferData(prev => ({ ...prev, quantity: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={handleTransferStock}
              disabled={
                !transferData.fromWarehouse ||
                !transferData.toWarehouse ||
                !transferData.quantity
              }
            >
              Transfer Stock
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 