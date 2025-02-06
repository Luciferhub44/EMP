import * as React from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatCurrency } from "@/lib/utils"
import { orders } from "@/data/orders"
import { ArrowRight } from "lucide-react"

export function RecentOrders() {
  // Get last 5 orders, sorted by date
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

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
                  {formatCurrency(order.totalAmount)}
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