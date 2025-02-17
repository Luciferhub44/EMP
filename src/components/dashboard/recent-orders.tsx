import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { Order } from "@/types"
import { useState, useEffect } from "react"

export function RecentOrders() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await api.get<{ orders: Order[] }>('/orders/recent')
        setRecentOrders(response.orders)
      } catch (error) {
        console.error('Failed to load orders:', error)
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  if (loading) return <Card><CardContent>Loading...</CardContent></Card>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Orders</CardTitle>
        <Link to="/orders">
          <Button variant="ghost" size="sm" className="gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {order.id}
                  </Link>
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
                  {formatCurrency(order.total as number)}
                </p>
                <Badge variant="outline" className="mt-1">
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 