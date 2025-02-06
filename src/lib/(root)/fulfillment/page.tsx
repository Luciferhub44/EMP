import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Loader2, Package } from "lucide-react"
import { ordersService } from "@/lib/services/orders"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import type { Order } from "@/types/orders"

export default function FulfillmentListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pendingOrders, setPendingOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadPendingOrders = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const orders = await ordersService.getPendingOrders(user.id, user.role === 'admin')
        setPendingOrders(orders)
      } catch (error) {
        console.error("Failed to load pending orders:", error)
        toast({
          title: "Error",
          description: "Failed to load pending orders",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPendingOrders()
  }, [user])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Fulfillment
          </h2>
          <p className="text-muted-foreground">
            {user?.role === 'admin'
              ? 'Manage order fulfillment and shipping'
              : 'Process your assigned orders'
            }
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No orders pending fulfillment</p>
              <p className="text-sm text-muted-foreground">
                All orders have been processed
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "paid" ? "success" : "default"}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/fulfillment/${order.id}`)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 