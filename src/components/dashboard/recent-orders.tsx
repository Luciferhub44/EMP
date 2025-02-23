//@ts-nocheck
import { useState, useEffect } from "react"
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
import { formatCurrency } from "@/lib/utils"
import { query } from "@/lib/db"
import type { Order } from "@/types/orders"
import { api } from "@/lib/api"
import { MonthlyRevenue, ChartData } from '@/types/analytics'


async function getRecentOrders(): Promise<Order[]> {
  try {
    const response = await query<Order>('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')
    return response
  } catch (error) {
    console.error('Error fetching recent orders:', error)
    return []
  }
}

export function RecentOrders() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  async function getChartData(): Promise<ChartData[]> {
    const { data: monthlyData } = await api.get<{ data: MonthlyRevenue[] }>('/analytics/monthly-revenue')
    return monthlyData.data.map((row: MonthlyRevenue) => ({
      name: new Date(row.month).toLocaleString('default', { month: 'short' }),
      total: Number(row.total)
    }))
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const chartData = await getChartData()
        setData(chartData)
      } catch (error) {
        console.error('Error loading chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

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