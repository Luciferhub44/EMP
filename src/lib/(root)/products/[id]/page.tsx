import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { api } from "@/lib/api"
import { Product, ProductStatus } from "@/types/products"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { queryOne } from "@/lib/db"

interface ProductDetails {
  product: Product
  stock: number
  needsRestock: boolean
}

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      try {
        const response = await queryOne<ProductDetails>(
          `SELECT 
            p.*,
            COALESCE(SUM(i.quantity), 0) as stock,
            COALESCE(MIN(i.quantity) <= i.minimum_stock, false) as needs_restock
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          WHERE p.id = $1
          GROUP BY p.id`,
          [id]
        )

        if (!response) {
          throw new Error('Product not found')
        }

        setProductDetails(response)
      } catch (error) {
        console.error('Error loading product:', error)
        toast({
          title: 'Error',
          description: 'Failed to load product details',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [id])

  const getStatusVariant = (status: ProductStatus) => {
    switch (status) {
      case "in_stock":
        return "success"
      case "out_of_stock":
        return "secondary"
      case "discontinued":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!productDetails) return <div>Product not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{productDetails.product.name}</h2>
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
              Total Stock: {productDetails.stock} units
              {productDetails.needsRestock && (
                <Badge variant="destructive" className="ml-2 flex w-fit items-center gap-1">
                  Needs Restocking
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">Model</p>
              <p className="text-muted-foreground">{productDetails.product.model}</p>
            </div>
            <div>
              <p className="font-semibold">SKU</p>
              <p className="text-muted-foreground">{productDetails.product.sku}</p>
            </div>
            <div>
              <p className="font-semibold">Price</p>
              <p className="text-muted-foreground">{formatCurrency(productDetails.product.price)}</p>
            </div>
            <div>
              <p className="font-semibold">Category</p>
              <p className="text-muted-foreground">{productDetails.product.category}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <Badge variant={getStatusVariant(productDetails.product.status as ProductStatus)}>
                {productDetails.product.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(productDetails.product.specifications).map(([key, value]) => (
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