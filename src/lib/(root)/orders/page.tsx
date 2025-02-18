import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Plus, Search, Loader2 } from "lucide-react"
import { ordersService } from "@/lib/services/orders"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import type { Order } from "@/types/orders"
import { OrderAssignment } from "@/components/order-assignment"

function getStatusColor(status: Order['status']) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-500'
    case 'confirmed':
      return 'bg-blue-500/20 text-blue-500'
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

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const data = await ordersService.getOrders(
          user.id,
          user.role === 'admin'
        )
        setOrders(data as Order[])
      } catch (error) {
        console.error("Failed to load orders:", error)
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [user])

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchLower = search.toLowerCase()
      return (
        order.id.toLowerCase().includes(searchLower) ||
        order.customerId.toLowerCase().includes(searchLower)
      )
    })
  }, [orders, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
        <Link to="/orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mt-2 text-lg font-medium">No orders found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 
                    "Try adjusting your search" : 
                    "Create your first order to get started"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.id}</p>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(order.total)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} items
                          </p>
                        </div>
                        {user?.role === 'admin' && (
                          <OrderAssignment
                            orderId={order.id}
                            currentAssignee={order.assignedTo}
                          />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 