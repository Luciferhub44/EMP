import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { updateProduct } from "@/lib/utils/products"
import { Product } from "@/types"

export default function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [categories, setCategories] = React.useState<{ name: string }[]>([])

  const [formData, setFormData] = React.useState<any>(null)

  React.useEffect(() => {
    async function loadData() {
      try {
        // Load product
        const { rows: [productRow] } = await db.query(
          'SELECT data FROM products WHERE id = $1',
          [id]
        )
        setProduct(productRow?.data || null)
        if (productRow?.data) {
          setFormData({
            name: productRow.data.name,
            model: productRow.data.model,
            sku: productRow.data.sku,
            price: productRow.data.price.toString(),
            category: productRow.data.category,
            specifications: { ...productRow.data.specifications }
          })
        }

        // Load categories
        const { rows: categoryRows } = await db.query('SELECT data FROM product_categories')
        setCategories(categoryRows.map(row => row.data))
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

  if (!product || !formData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProduct(id!, {
        ...product,
        ...formData,
        price: parseFloat(formData.price)
      })
      alert("Product updated successfully!")
      navigate(`/products/${id}`)
    } catch (error) {
      alert("Failed to update product. Please try again.")
    }
  }

  const handleSpecificationChange = (key: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-muted-foreground">
            Update product information and specifications
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/products/${id}`)}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Product Name</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, sku: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: string) => setFormData((prev: any) => ({ 
                    ...prev, 
                    category: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Object.entries(formData.specifications).map(([key, value]) => (
              <div key={key} className="grid gap-2">
                <Label className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Input
                  value={(value as string | number).toString()}
                  onChange={(e) => handleSpecificationChange(key, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
} 