import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import type { ProductCategory } from "@/types"

const defaultProduct = {
  name: "",
  model: "",
  sku: "",
  price: "",
  description: "",
  category: "",
  subCategory: "",
  specifications: {
    weight: "",
    dimensions: "",
    power: "",
    capacity: "",
    engineType: "",
    operatingWeight: "",
  },
  minStock: 5,
  status: "active",
}

export default function NewProductPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  const [categories, setCategories] = React.useState<ProductCategory[]>([])
  const [formData, setFormData] = React.useState(defaultProduct)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadCategories = async () => {
      try {
        const response = await fetch('/api/product-categories', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        if (!response.ok) throw new Error('Failed to load categories')
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Failed to load categories:', error)
        toast({
          title: "Error",
          description: "Failed to load product categories",
          variant: "destructive",
        })
      }
    }
    loadCategories()
  }, [user, navigate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.model.trim()) newErrors.model = "Model is required"
    if (!formData.sku.trim()) newErrors.sku = "SKU is required"
    if (!formData.price) newErrors.price = "Price is required"
    if (!formData.category) newErrors.category = "Category is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          createdBy: user.id,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create product')
      }

      const product = await response.json()
      toast({
        title: "Success",
        description: "Product created successfully",
      })
      navigate(`/products/${product.id}`)
    } catch (error) {
      console.error('Failed to create product:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCategory = categories.find(c => c.name === formData.category)

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
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    model: e.target.value 
                  }))}
                  className={errors.model ? "border-red-500" : ""}
                />
                {errors.model && (
                  <p className="text-sm text-red-500">{errors.model}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sku: e.target.value 
                  }))}
                  className={errors.sku ? "border-red-500" : ""}
                />
                {errors.sku && (
                  <p className="text-sm text-red-500">{errors.sku}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    price: e.target.value 
                  }))}
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                rows={4}
              />
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
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
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
                  value={value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    specifications: {
                      ...prev.specifications,
                      [key]: e.target.value
                    }
                  }))}
                  className={errors[key] ? "border-red-500" : ""}
                />
                {errors[key] && (
                  <p className="text-sm text-red-500">{errors[key]}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 