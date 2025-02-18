import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Loader2, DollarSign } from "lucide-react"
import { ordersService } from "@/lib/services/orders"
import { fulfillmentService } from "@/lib/services/fulfillment"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { TransportQuotes } from "@/components/fulfillment/transport-quote-card"
import type { Order, FulfillmentDetails } from "@/types/orders"

export default function FulfillmentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const loadFulfillment = async () => {
      if (!orderId || !user) return
      setIsLoading(true)
      try {
        const [orderData, fulfillmentData] = await Promise.all([
          ordersService.getOrder(orderId),
          fulfillmentService.getFulfillment(orderId)
        ])
        setOrder(orderData as Order | null)
        setFulfillment(fulfillmentData as FulfillmentDetails | null)
      } catch (error) {
        console.error("Failed to load fulfillment:", error)
        toast({
          title: "Error",
          description: "Failed to load fulfillment details",
          variant: "destructive",
        })
        if (error instanceof Error && error.message === "Access denied") {
          navigate("/orders")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadFulfillment()
  }, [orderId, user, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!orderId || !user) return
    setIsUpdating(true)

    try {
      const formData = new FormData(e.currentTarget)
      const updates = {
        trackingNumber: formData.get("trackingNumber") as string,
        carrier: formData.get("carrier") as string,
        notes: formData.get("notes") as string
      }

      const updatedFulfillment = await fulfillmentService.updateFulfillment(
        orderId,
        updates,
        user.id,
        user.role === 'admin'
      )
      setFulfillment(updatedFulfillment as FulfillmentDetails)
      toast({
        title: "Success",
        description: "Fulfillment details updated successfully",
      })
    } catch (error) {
      console.error("Failed to update fulfillment:", error)
      toast({
        title: "Error",
        description: "Failed to update fulfillment details",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePaymentRedirect = () => {
    navigate(`/fulfillment/payment/${orderId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!order || !fulfillment) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-lg">Fulfillment not found</p>
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
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Order
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Fulfillment for Order {order.id}
            </h2>
            <p className="text-muted-foreground">
              Manage order fulfillment and shipping
            </p>
          </div>
        </div>
        {order.paymentStatus !== 'paid' && (
          <Button onClick={handlePaymentRedirect}>
            <DollarSign className="mr-2 h-4 w-4" />
            Process Payment
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.shipping?.address ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Shipping Address</p>
                  <p>{order.shipping.address.street}</p>
                  <p>
                    {order.shipping.address.city}, {order.shipping.address.state}{" "}
                    {order.shipping.address.postalCode}
                  </p>
                  <p>{order.shipping.address.country}</p>
                </div>
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
              </>
            ) : (
              <p className="text-muted-foreground">No shipping information available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className="text-lg">
              {fulfillment.status}
            </Badge>
            {fulfillment.carrier && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Carrier</p>
                <p>{fulfillment.carrier}</p>
              </div>
            )}
            {fulfillment.trackingNumber && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tracking Number</p>
                <p>{fulfillment.trackingNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Update Fulfillment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    name="carrier"
                    defaultValue={fulfillment.carrier}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    name="trackingNumber"
                    defaultValue={fulfillment.trackingNumber}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={fulfillment.notes}
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Fulfillment'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fulfillment History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {fulfillment.history.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <Badge variant="outline">
                        {entry.status}
                      </Badge>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 