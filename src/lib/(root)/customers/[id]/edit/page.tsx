import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { customerService } from "@/lib/services/customer"
import { toast } from "@/components/ui/use-toast"
import type { Customer } from "@/types"

export default function CustomerEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    const loadCustomer = async () => {
      if (!id) return
      try {
        const data = await customerService.getCustomer(id)
        setCustomer(data)
      } catch (error) {
        console.error("Failed to load customer:", error)
        toast({
          title: "Error",
          description: "Failed to load customer",
          variant: "destructive",
        })
        navigate("/customers")
      } finally {
        setIsLoading(false)
      }
    }
    loadCustomer()
  }, [id, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) return
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const updates = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        company: formData.get("company") as string,
        address: {
          street: formData.get("street") as string,
          city: formData.get("city") as string,
          state: formData.get("state") as string,
          postalCode: formData.get("postalCode") as string,
          country: formData.get("country") as string,
        }
      }

      await customerService.updateCustomer(id, updates)
      toast({
        title: "Success",
        description: "Customer updated successfully",
      })
      navigate(`/customers/${id}`)
    } catch (error) {
      console.error("Failed to update customer:", error)
      toast({
        title: "Error",
        description: "Failed to update customer",
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

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-lg">Customer not found</p>
        <Button
          variant="link"
          onClick={() => navigate("/customers")}
          className="mt-4"
        >
          Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/customers/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Edit Customer</h2>
            <p className="text-muted-foreground">
              Update customer information
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={customer.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  defaultValue={customer.email}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone"
                  defaultValue={customer.phone}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  name="company"
                  defaultValue={customer.company}
                  required 
                />
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input 
                    id="street" 
                    name="street"
                    defaultValue={customer.address.street}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    name="city"
                    defaultValue={customer.address.city}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    name="state"
                    defaultValue={customer.address.state}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input 
                    id="postalCode" 
                    name="postalCode"
                    defaultValue={customer.address.postalCode}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    name="country"
                    defaultValue={customer.address.country}
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
} 