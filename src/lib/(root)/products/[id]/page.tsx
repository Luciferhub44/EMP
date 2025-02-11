import * as React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/lib/api/db"
import { Product, ProductStatus } from "@/types/product"
import { getTotalStock, needsRestocking } from "@/lib/utils/inventory"
import { Loader2 } from "lucide-react"

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [totalStockCount, setTotalStockCount] = React.useState(0)
  const [isRestocking, setIsRestocking] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      try {
        // Load product
        const { rows: [productRow] } = await db.query(
          'SELECT data FROM products WHERE id = $1',
          [id]
        )
        
        if (productRow) {
          setProduct(productRow.data)
          const stock = await getTotalStock(productRow.data.id)
          const needsRestock = await needsRestocking(productRow.data.id)
          setTotalStockCount(stock)
          setIsRestocking(needsRestock)
        }
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const getStatusVariant = (status: ProductStatus) => {
    switch (status) {
      case "active":
        return "success"
      case "inactive":
        return "secondary"
      case "discontinued":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!product) return <div>Product not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
          <p className="text-muted-foreground">
            Product details and inventory management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/products")}>
            Back
          </Button>
          <Link to={`/products/${id}/edit`}>
            <Button>Edit Product</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Total Stock: {totalStockCount} units
              {isRestocking && (
                <Badge variant="destructive" className="ml-2 flex w-fit items-center gap-1">
                  Needs Restocking
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">Model</p>
              <p className="text-muted-foreground">{product.model}</p>
            </div>
            <div>
              <p className="font-semibold">SKU</p>
              <p className="text-muted-foreground">{product.sku}</p>
            </div>
            <div>
              <p className="font-semibold">Price</p>
              <p className="text-muted-foreground">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="font-semibold">Category</p>
              <p className="text-muted-foreground">{product.category}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <Badge variant={getStatusVariant(product.status)}>
                {product.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key}>
                <p className="font-semibold capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-muted-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 