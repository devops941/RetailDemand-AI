import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'

interface DataPoint {
  date?: string
  month?: string
  units: number
  revenue?: number
}

interface SalesLineChartProps {
  data: DataPoint[]
  xKey?: string
  showRevenue?: boolean
}

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

export default function SalesLineChart({ data, xKey = 'date', showRevenue = false }: SalesLineChartProps) {
  if (!data?.length) return (
    <div className="h-full flex items-center justify-center text-sm text-muted">No data available</div>
  )

  const sampled = data.length > 90 ? data.filter((_, i) => i % Math.ceil(data.length / 90) === 0) : data

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sampled} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickFormatter={(v) => typeof v === 'string' ? v.slice(5) : v}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatNumber}
          width={40}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value: number, name: string) => [
            name === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString(),
            name === 'units' ? 'Units Sold' : 'Revenue',
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="units"
          stroke="#0F766E"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="units"
        />
        {showRevenue && (
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="revenue"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
