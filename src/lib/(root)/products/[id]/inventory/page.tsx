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
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Product, Warehouse } from "@/types"

export default function ProductInventoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [product, setProduct] = React.useState<Product | null>(null)
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([])
  const [warehouseStocks, setWarehouseStocks] = React.useState<Record<string, number>>({})
  
  const [updateData, setUpdateData] = React.useState({
    warehouseId: "",
    quantity: "",
  })
  
  const [transferData, setTransferData] = React.useState({
    fromWarehouse: "",
    toWarehouse: "",
    quantity: "",
  })

  React.useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        // Load product details
        const productRes = await fetch(`/api/products/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        if (!productRes.ok) throw new Error('Failed to load product')
        const productData = await productRes.json()
        setProduct(productData)

        // Load warehouses
        const warehousesRes = await fetch('/api/warehouses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        if (!warehousesRes.ok) throw new Error('Failed to load warehouses')
        const warehousesData = await warehousesRes.json()
        setWarehouses(warehousesData || [])

        // Load stocks for each warehouse
        const stocks: Record<string, number> = {}
        if (warehousesData && Array.isArray(warehousesData)) {
          for (const warehouse of warehousesData) {
            const stockRes = await fetch(`/api/inventory/${id}/${warehouse.id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            })
            if (stockRes.ok) {
              const { quantity } = await stockRes.json()
              stocks[warehouse.id] = quantity
            }
          }
        }
        setWarehouseStocks(stocks)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: "Error",
          description: "Failed to load inventory data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, user, navigate])

  const handleUpdateStock = async () => {
    if (!updateData.warehouseId || !updateData.quantity) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/inventory/${id}/${updateData.warehouseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ quantity: parseInt(updateData.quantity) })
      })

      if (!response.ok) throw new Error('Failed to update stock')

      const { quantity } = await response.json()
      setWarehouseStocks(prev => ({
        ...prev,
        [updateData.warehouseId]: quantity
      }))

      toast({
        title: "Success",
        description: "Stock updated successfully",
      })

      setUpdateData({ warehouseId: "", quantity: "" })
    } catch (error) {
      console.error('Failed to update stock:', error)
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTransferStock = async () => {
    if (!transferData.fromWarehouse || !transferData.toWarehouse || !transferData.quantity) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/inventory/${id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          fromWarehouseId: transferData.fromWarehouse,
          toWarehouseId: transferData.toWarehouse,
          quantity: parseInt(transferData.quantity)
        })
      })

      if (!response.ok) throw new Error('Failed to transfer stock')

      const { fromQuantity, toQuantity } = await response.json()
      setWarehouseStocks(prev => ({
        ...prev,
        [transferData.fromWarehouse]: fromQuantity,
        [transferData.toWarehouse]: toQuantity
      }))

      toast({
        title: "Success",
        description: "Stock transferred successfully",
      })

      setTransferData({ fromWarehouse: "", toWarehouse: "", quantity: "" })
    } catch (error) {
      console.error('Failed to transfer stock:', error)
      toast({
        title: "Error",
        description: "Failed to transfer stock",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    )
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
                value={updateData.warehouseId}
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, warehouseId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
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
            <div className="grid gap-2">
              <Label>New Quantity</Label>
              <Input
                type="number"
                min="0"
                value={updateData.quantity}
                onChange={(e) => setUpdateData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleUpdateStock}
              disabled={isSubmitting || !updateData.warehouseId || !updateData.quantity}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Stock'
              )}
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
                onValueChange={(value) => setTransferData(prev => ({ ...prev, fromWarehouse: value }))}
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
                onValueChange={(value) => setTransferData(prev => ({ ...prev, toWarehouse: value }))}
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
                      {warehouse.name} ({warehouseStocks[warehouse.id] || 0} units)
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
                max={transferData.fromWarehouse ? warehouseStocks[transferData.fromWarehouse] || 0 : undefined}
                value={transferData.quantity}
                onChange={(e) => setTransferData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleTransferStock}
              disabled={
                isSubmitting ||
                !transferData.fromWarehouse ||
                !transferData.toWarehouse ||
                !transferData.quantity ||
                parseInt(transferData.quantity) > (warehouseStocks[transferData.fromWarehouse] || 0)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                'Transfer Stock'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 