import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft, Loader2, Package, Trash2 } from "lucide-react"
import { ordersService } from "@/lib/services/orders"
import { customerService } from "@/lib/services/customer"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { OrderAssignment } from "@/components/order-assignment"
import { TransportQuotes } from "@/components/fulfillment/transport-quote-card"
import type { Order } from "@/types/orders"
import type { Customer } from "@/types"

function getStatusColor(status: Order['status']) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-500'
    case 'processing':
      return 'bg-purple-500/20 text-purple-500'
    case 'shipped':
      return 'bg-indigo-500/20 text-indigo-500'
    case 'delivered':
      return 'bg-green-500/20 text-green-500'
    case 'cancelled':
      return 'bg-red-500/20 text-red-500'
    default:
      return 'bg-gray-500/20 text-gray-500'
  }
}

function getPaymentStatusColor(status: Order['paymentStatus']) {
  switch (status) {
    case 'paid':
      return 'bg-green-500/20 text-green-500'
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-500'
    case 'failed':
      return 'bg-red-500/20 text-red-500'
    case 'refunded':
      return 'bg-blue-500/20 text-blue-500'
    default:
      return 'bg-gray-500/20 text-gray-500'
  }
}

function getFulfillmentStatusColor(status: Order['fulfillmentStatus']) {
  switch (status) {
    case 'processing':
      return 'bg-purple-500/20 text-purple-500'
    case 'shipped':
      return 'bg-indigo-500/20 text-indigo-500'
    case 'delivered':
      return 'bg-green-500/20 text-green-500'
    case 'failed':
      return 'bg-red-500/20 text-red-500'
    default:
      return 'bg-gray-500/20 text-gray-500'
  }
}

export default function OrderDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order] = React.useState<Order | null>(null)
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadOrderDetails = async () => {
      if (!id || !user) return
      setIsLoading(true)
      try {
        const orderData = await ordersService.getOrder(id, user.id, user.role === 'admin')
        if (orderData) {
          const customerData = await customerService.getCustomer(orderData.customerId)
          setCustomer(customerData)
        }
      } catch (error) {
        console.error("Failed to load order details:", error)
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        })
        if (error instanceof Error && error.message === "Access denied") {
          navigate("/orders")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadOrderDetails()
  }, [id, user, navigate])

  const handleDelete = async () => {
    if (user?.role !== 'admin' || !order) return
    
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return
    }

    try {
      await ordersService.deleteOrder(order.id, true)
      toast({
        title: "Success",
        description: "Order deleted successfully",
      })
      navigate("/orders")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      })
    }
  }

  const renderShippingInfo = () => {
    if (!order?.shipping) return null;

    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.shipping.address && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Shipping Address</p>
              <p>{order.shipping.address.street}</p>
              <p>
                {order.shipping.address.city}, {order.shipping.address.state}{" "}
                {order.shipping.address.postalCode}
              </p>
              <p>{order.shipping.address.country}</p>
            </div>
          )}
          {order.shipping.carrier && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Shipping Method</p>
              <p>{order.shipping.carrier}</p>
            </div>
          )}
          {order.shipping.estimatedDelivery && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Estimated Delivery</p>
              <p>{formatDate(order.shipping.estimatedDelivery)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-lg">Order not found</p>
        <Button
          variant="link"
          onClick={() => navigate("/orders")}
          className="mt-4"
        >
          Back to Orders
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
            onClick={() => navigate("/orders")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Order {order.id}</h2>
            <p className="text-muted-foreground">
              View order details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <OrderAssignment
              orderId={order.id}
              currentAssignee={order.assignedTo}
            />
          )}
          <Button onClick={() => navigate(`/fulfillment/${order.id}`)}>
            <Package className="mr-2 h-4 w-4" />
            Manage Fulfillment
          </Button>
          {user?.role === 'admin' && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
              <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
              <Badge className={getFulfillmentStatusColor(order.fulfillmentStatus)}>
                {order.fulfillmentStatus}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
            {order.notes && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p>{customer.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{customer.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{customer.phone}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p>{customer.company}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{item.productId}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.productId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p>{formatCurrency(order.subtotal)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Tax</p>
                <p>{formatCurrency(order.tax)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Shipping</p>
                <p>{formatCurrency(order.shippingCost)}</p>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <p>Total</p>
                <p>{formatCurrency(order.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {renderShippingInfo()}

        {order.status === 'pending' && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Transport Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <TransportQuotes orderId={order.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 