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
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import type { Product, ProductCategory } from "@/types"

export default function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [product, setProduct] = React.useState<Product | null>(null)
  const [categories, setCategories] = React.useState<ProductCategory[]>([])
  const [formData, setFormData] = React.useState<Partial<Product> | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        // Load product
        const productRes = await fetch(`/api/products/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        if (!productRes.ok) throw new Error('Failed to load product')
        const productData = await productRes.json()
        setProduct(productData)
        setFormData({
          name: productData.name,
          model: productData.model,
          sku: productData.sku,
          price: productData.price.toString(),
          category: productData.category,
          subCategory: productData.subCategory,
          specifications: { ...productData.specifications },
        })

        // Load categories
        const categoriesRes = await fetch('/api/product-categories', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        if (!categoriesRes.ok) throw new Error('Failed to load categories')
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, user, navigate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData?.name?.trim()) newErrors.name = "Name is required"
    if (!formData?.model?.trim()) newErrors.model = "Model is required"
    if (!formData?.sku?.trim()) newErrors.sku = "SKU is required"
    if (!formData?.price) newErrors.price = "Price is required"
    if (!formData?.category) newErrors.category = "Category is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || !validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price.toString()) : 0,
          updatedBy: user?.id,
          updatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to update product')

      toast({
        title: "Success",
        description: "Product updated successfully",
      })
      navigate(`/products/${id}`)
    } catch (error) {
      console.error('Failed to update product:', error)
      toast({
        title: "Error",
        description: "Failed to update product",
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

  if (!product || !formData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    )
  }

  const selectedCategory = categories.find(c => c.name === formData.category)

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
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
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
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, sku: e.target.value }))}
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
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, price: e.target.value }))}
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price}</p>
                )}
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
                    subCategory: "" // Reset sub-category when category changes
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Object.entries(formData.specifications || {}).map(([key, value]) => (
              <div key={key} className="grid gap-2">
                <Label className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Input
                  value={(value as string | number).toString()}
                  onChange={(e) => setFormData((prev: any) => ({
                    ...prev,
                    specifications: {
                      ...prev.specifications,
                      [key]: e.target.value
                    }
                  }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 