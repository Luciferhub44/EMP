import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
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
import { ordersService } from "@/lib/services/orders"
import { customerService } from "@/lib/services/customer"
import { productService } from "@/lib/services/product"
import { formatCurrency } from "@/lib/utils"
import type { Customer } from "@/types/customer"
import type { Product } from "@/types/products"
import type { OrderItem } from "@/types/orders"

interface OrderFormData {
  customerId: string
  items: OrderItem[]
  shippingAddress: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  notes?: string
}

export default function NewOrderPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState<OrderFormData>({
    customerId: "",
    items: [],
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: ""
    },
    notes: ""
  })
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "Only administrators can create new orders",
          variant: "destructive",
        })
        navigate("/orders")
        return
      }

      try {
        const [customersData, productsData] = await Promise.all([
          customerService.getCustomers(user?.id || "", user?.role === "admin"),
          productService.getProducts()
        ])
        setCustomers(customersData)
        setProducts(productsData.map(product => ({
          ...product,
          specifications: Object.fromEntries(
            Object.entries(product.specifications || {})
              .filter(([_, v]) => v !== undefined)
          ) as Product['specifications']
        })))
      } catch (error) {
        console.error("Failed to load data:", error)
        toast({
          title: "Error",
          description: "Failed to load required data",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [user, navigate])

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer?.address) return

    setFormData(prev => ({
      ...prev,
      customerId,
      shippingAddress: {
        street: customer.address.street || "",
        city: customer.address.city || "",
        state: customer.address.state || "",
        country: customer.address.country || "",
        postalCode: customer.address.postalCode || ""
      }
    }))
  }

  const handleAddItem = () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: product.id,
          quantity: parseInt(quantity),
          price: product.price,
          productName: product.name
        }
      ]
    }))
    setSelectedProduct("")
    setQuantity("1")
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const order = await ordersService.createOrder(
        {
          ...formData,
          status: "pending",
          paymentStatus: "pending",
          fulfillmentStatus: "pending",
          total: calculateTotal(),
          customerName: customers.find(c => c.id === formData.customerId)?.name || "",
        },
        true,
      )
      toast({
        title: "Success",
        description: "Order created successfully",
      })
      navigate(`/orders/${order.id}`)
    } catch (error) {
      console.error("Failed to create order:", error)
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Order</h2>
          <p className="text-muted-foreground">
            Create a new order for a customer
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select
                value={formData.customerId}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company || customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Product</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProduct}
                >
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between border-b py-2"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {formData.items.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="font-medium">Total</p>
                  <p className="font-bold">{formatCurrency(calculateTotal())}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Street Address</Label>
              <Input
                required
                value={formData.shippingAddress.street}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shippingAddress: {
                    ...prev.shippingAddress,
                    street: e.target.value
                  }
                }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  required
                  value={formData.shippingAddress.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      city: e.target.value
                    }
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  required
                  value={formData.shippingAddress.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      state: e.target.value
                    }
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  required
                  value={formData.shippingAddress.country}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      country: e.target.value
                    }
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Postal Code</Label>
                <Input
                  required
                  value={formData.shippingAddress.postalCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      postalCode: e.target.value
                    }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                placeholder="Add any additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={formData.items.length === 0 || isLoading}
          >
            {isLoading ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  )
} 