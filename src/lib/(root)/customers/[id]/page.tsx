import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft, Mail, Phone, MapPin, Building, Loader2, Pencil } from "lucide-react"
import { customerService } from "@/lib/services/customer"
import { toast } from "@/components/ui/use-toast"
import type { Customer, Order } from "@/types"
import { useAuth } from "@/contexts/auth-context"

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

export default function CustomerDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [stats, setStats] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadCustomerData = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const [customerData, customerOrders, customerStats] = await Promise.all([
          customerService.getCustomer(id),
          customerService.getCustomerOrders(id),
          customerService.getCustomerStats(id)
        ])
        setCustomer(customerData)
        setOrders(customerOrders)
        setStats(customerStats)
      } catch (error) {
        console.error("Error loading customer data:", error)
        toast({
          title: "Error",
          description: "Failed to load customer details",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadCustomerData()
  }, [id])

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
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    )
  }

  const handleEditCustomer = () => {
    toast({
      title: "Coming Soon",
      description: "Customer editing will be available in a future update",
    })
  }

  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
            <p className="text-muted-foreground">
              View customer details
            </p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => navigate(`/customers/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p>{customer.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p>{customer.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <p>{customer.company}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <p>
                {customer.address.street}<br />
                {customer.address.city}, {customer.address.state} {customer.address.postalCode}<br />
                {customer.address.country}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Spent</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Customer Since</p>
              <p className="text-2xl font-bold">
                {orders.length > 0 ? 
                  formatDate(orders[orders.length - 1].createdAt) :
                  "No orders yet"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground">
                    This customer hasn't placed any orders
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.id}</p>
                          <Badge variant="secondary">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {order.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 