import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, Search, Pencil } from "lucide-react"
import { productService } from "@/lib/services/product"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { Product } from "@/types/products"

export default function ProductsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = React.useState("")
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts()
        setProducts(data)
      } catch (error) {
        console.error("Failed to load products:", error)
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const searchLower = search.toLowerCase()
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower)
      )
    })
  }, [products, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? "Manage your product catalog" 
              : "View product catalog"
            }
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mt-2 text-lg font-medium">No products found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 
                    "Try adjusting your search" : 
                    "Add your first product to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="relative overflow-hidden">
                    <Link 
                      to={`/products/${product.id}`}
                      className="block hover:bg-muted/50"
                    >
                      <CardContent className="p-6">
                        <div className="aspect-square mb-4 relative">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="rounded-lg object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                              No image
                            </div>
                          )}
                          <Badge 
                            className="absolute top-2 right-2"
                            variant={product.status === 'active' ? 'success' : 'destructive'}
                          >
                            {product.status === 'active' ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {product.category} • {product.sku}
                          </p>
                          <p className="font-medium">{formatCurrency(product.price)}</p>
                        </div>
                      </CardContent>
                    </Link>
                    {user?.role === 'admin' && (
                      <div className="absolute right-4 top-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            navigate(`/products/${product.id}/edit`)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 