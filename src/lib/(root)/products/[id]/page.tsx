import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { products } from "@/data/products"
import { warehouses } from "@/data/warehouses"
import { getTotalStock, getWarehouseStock, needsRestock } from "@/lib/utils/inventory"
import { formatCurrency } from "@/lib/utils"
import { Package, Edit, AlertTriangle, ArrowLeft, Pencil } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function ProductDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = React.useState<Product | null>(null)

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    )
  }

  const totalStock = getTotalStock(product.id)
  const needsRestocking = needsRestock(product.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/products")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
            <p className="text-muted-foreground">
              View product details
            </p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => navigate(`/products/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-24 w-24 rounded-md object-cover"
                />
              ) : (
                <Package className="h-24 w-24 rounded-md" />
              )}
              <div>
                <p className="text-sm font-medium">SKU</p>
                <p className="text-sm">{product.sku}</p>
                <p className="mt-2 text-sm font-medium">Price</p>
                <p className="text-sm">{formatCurrency(product.price)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Specifications</p>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>
              Total Stock: {totalStock} units
              {needsRestocking && (
                <Badge variant="destructive" className="ml-2 flex w-fit items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Low Stock
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min. Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.inventory.map((inv) => {
                  const warehouse = warehouses.find(w => w.id === inv.warehouseId)
                  if (!warehouse) return null

                  return (
                    <TableRow key={inv.warehouseId}>
                      <TableCell>{warehouse.name}</TableCell>
                      <TableCell>{warehouse.location}</TableCell>
                      <TableCell>{inv.quantity}</TableCell>
                      <TableCell>{inv.minimumStock}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 