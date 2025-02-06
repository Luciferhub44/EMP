import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart } from "@/components/charts/AreaChart"

const trafficData = [
  { name: "Jan", visits: 2400 },
  { name: "Feb", visits: 1398 },
  { name: "Mar", visits: 9800 },
  { name: "Apr", visits: 3908 },
  { name: "May", visits: 4800 },
  { name: "Jun", visits: 3800 },
  { name: "Jul", visits: 4300 },
]

const conversionData = [
  { name: "Jan", rate: 65 },
  { name: "Feb", rate: 59 },
  { name: "Mar", rate: 80 },
  { name: "Apr", rate: 71 },
  { name: "May", rate: 56 },
  { name: "Jun", rate: 55 },
  { name: "Jul", rate: 40 },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Traffic Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart 
              data={trafficData} 
              dataKey="visits" 
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart 
              data={conversionData} 
              dataKey="rate"
              strokeColor="hsl(var(--secondary))"
              fillColor="hsl(var(--secondary)/.2)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 