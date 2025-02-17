import * as React from "react"
import { useNavigate } from "react-router-dom"
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
import { createProduct } from "@/lib/utils/products"
import { db } from "@/lib/api/db"
import { ProductCategory } from "@/types"
import { Loader2 } from "lucide-react"


const defaultSpecifications = {
  weight: "",
  power: "",
  engineType: "",
  capacity: "",
  dimensions: "",
  operatingWeight: "",
}

export default function NewProductPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = React.useState<ProductCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [formData, setFormData] = React.useState({
    name: "",
    model: "",
    sku: "",
    price: "",
    category: "",
    subCategory: "",
    specifications: { ...defaultSpecifications }
  })

  React.useEffect(() => {
    async function loadCategories() {
      try {
        const { rows } = await db.query('SELECT data FROM product_categories')
        setCategories(rows.map((row: { data: any }) => row.data))
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [])

  const selectedCategory = categories.find(c => c.name === formData.category)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const product = await createProduct({
        ...formData,
        price: parseFloat(formData.price),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        image: ""
      })
      alert("Product created successfully!")
      navigate(`/products/${product.id}`)
    } catch (error) {
      alert("Failed to create product. Please try again.")
    }
  }

  const handleSpecificationChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Product</h2>
          <p className="text-muted-foreground">
            Add a new product to your catalog
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/products")}>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    category: value,
                    subCategory: "" 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
              {selectedCategory?.subCategories && (
                <div className="grid gap-2">
                  <Label>Sub Category</Label>
                  <Select
                    value={formData.subCategory}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      subCategory: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.subCategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  value={value.toString()}
                  onChange={(e) => handleSpecificationChange(key, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            Create Product
          </Button>
        </div>
      </form>
    </div>
  )
} 