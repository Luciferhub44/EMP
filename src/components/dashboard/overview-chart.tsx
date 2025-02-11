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
import { db } from "@/lib/api/db"
import { formatCurrency } from "@/lib/utils"

interface ChartData {
  name: string
  total: number
}

async function getChartData(): Promise<ChartData[]> {
  const now = new Date()
  const data: ChartData[] = []
  
  try {
    // Get last 12 months of orders from database
    const result = await db.query(`
      SELECT 
        date_trunc('month', (data->>'createdAt')::timestamp) as month,
        SUM((data->>'total')::numeric) as total
      FROM orders
      WHERE (data->>'createdAt')::timestamp >= $1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, [new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()])
    
    // Format the data for the chart
    result.rows.forEach(row => {
      const date = new Date(row.month)
      data.push({
        name: date.toLocaleString('default', { month: 'short' }),
        total: Number(row.total)
      })
    })
    
    // Fill in any missing months with zero
    const months = 12
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleString('default', { month: 'short' })
      
      if (!data.find(d => d.name === monthName)) {
        data.push({
          name: monthName,
          total: 0
        })
      }
    }
    
    // Sort by date
    data.sort((a, b) => {
      const monthA = new Date(Date.parse(`${a.name} 1, ${now.getFullYear()}`))
      const monthB = new Date(Date.parse(`${b.name} 1, ${now.getFullYear()}`))
      return monthA.getTime() - monthB.getTime()
    })
    
    return data
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return []
  }
}

export function Overview() {
  const [data, setData] = React.useState<ChartData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
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