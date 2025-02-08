import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, PieChart, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaChart } from "@/components/charts/AreaChart"

const revenueData = [
  { name: "Jan", revenue: 12400 },
  { name: "Feb", revenue: 15398 },
  { name: "Mar", revenue: 19800 },
  { name: "Apr", revenue: 23908 },
  { name: "May", revenue: 28400 },
  { name: "Jun", revenue: 25800 },
  { name: "Jul", revenue: 29300 },
]

const salesData = [
  { name: "Jan", sales: 245 },
  { name: "Feb", sales: 289 },
  { name: "Mar", sales: 432 },
  { name: "Apr", sales: 378 },
  { name: "May", sales: 489 },
  { name: "Jun", sales: 465 },
  { name: "Jul", sales: 521 },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Reports
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart 
              data={revenueData} 
              dataKey="revenue"
              strokeColor="hsl(var(--primary))"
              fillColor="hsl(var(--primary)/.2)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart 
              data={salesData} 
              dataKey="sales"
              strokeColor="hsl(var(--secondary))"
              fillColor="hsl(var(--secondary)/.2)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <BarChart className="h-5 w-5 opacity-50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${product.revenue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionSales.map((region, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <PieChart className="h-5 w-5 opacity-50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{region.name}</p>
                      <p className="text-sm text-muted-foreground">{region.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${region.revenue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const topProducts = [
  { name: "Premium Laptop Pro", category: "Electronics", revenue: "45,899" },
  { name: "Wireless Earbuds", category: "Audio", revenue: "23,459" },
  { name: "Smart Watch Elite", category: "Wearables", revenue: "18,234" },
  { name: "4K Monitor", category: "Electronics", revenue: "16,789" },
]

const regionSales = [
  { name: "North America", orders: 458, revenue: "89,234" },
  { name: "Europe", orders: 397, revenue: "67,892" },
  { name: "Asia", orders: 456, revenue: "78,345" },
  { name: "Australia", orders: 123, revenue: "23,456" },
] 