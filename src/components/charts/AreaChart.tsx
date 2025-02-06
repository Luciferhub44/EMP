import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface AreaChartProps {
  data: Array<Record<string, string | number>>
  dataKey: string
  strokeColor?: string
  fillColor?: string
}

export function AreaChart({
  data,
  dataKey,
  strokeColor = "hsl(var(--primary))",
  fillColor = "hsl(var(--primary)/.2)",
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsAreaChart data={data}>
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
        <Tooltip />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          fill={fillColor}
          strokeWidth={2}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
} 