import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { orders } from "@/data/orders"
import { formatCurrency } from "@/lib/utils"

interface ChartData {
  name: string
  total: number
}

function getChartData(): ChartData[] {
  const now = new Date()
  const data: ChartData[] = []
  
  // Get last 12 months of data
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    // Filter orders for this month
    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getMonth() === date.getMonth() &&
             orderDate.getFullYear() === date.getFullYear()
    })
    
    // Calculate total revenue for this month
    const total = monthOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    
    data.push({
      name: monthName,
      total
    })
  }
  
  return data
}

export function Overview() {
  const data = React.useMemo(() => getChartData(), [])
  const [hoveredValue, setHoveredValue] = React.useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="pt-2">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const value = formatCurrency(payload[0].value as number)
                    setHoveredValue(value)
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Revenue
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {value}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  setHoveredValue(null)
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 