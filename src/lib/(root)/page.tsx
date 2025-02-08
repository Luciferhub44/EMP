import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { ordersService } from "@/lib/services/orders"
import { fulfillmentService } from "@/lib/services/fulfillment"
import { formatCurrency } from "@/lib/utils"
import type { Order, FulfillmentDetails } from "@/types/orders"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [fulfillments, setFulfillments] = React.useState<FulfillmentDetails[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        // Load orders based on user role
        const orderData = await ordersService.getOrders(user.id, user.role === 'admin')
        setOrders(orderData as Order[])

        // Load fulfillments based on user role
        let fulfillmentData: FulfillmentDetails[]
        if (user.role === 'admin') {
          // Admins see all fulfillments
          fulfillmentData = Object.values(await fulfillmentService.getAllFulfillments())
        } else {
          // Employees only see their assigned fulfillments
          fulfillmentData = await fulfillmentService.getEmployeeFulfillments(user.id)
        }
        setFulfillments(fulfillmentData)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  const renderMetrics = () => {
    if (user?.role === 'admin') {
      return (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          {/* Admin sees all metrics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Fulfillments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fulfillments.filter(f => f.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Employee dashboard metrics
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fulfillments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fulfillments.filter(f => f.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'Overview of all orders and fulfillments'
              : 'Overview of your assigned orders and fulfillments'
            }
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => navigate("/orders/new")}>
            Create Order
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {renderMetrics()}
          
          {/* Recent Activity Section */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Show relevant recent activity based on user role */}
              {orders.slice(0, 5).map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b py-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">Order {order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {order.status}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
