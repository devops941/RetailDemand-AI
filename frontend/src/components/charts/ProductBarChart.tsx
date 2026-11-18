import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'

interface ProductData {
  product_name?: string
  product_id: string
  total_units: number
  revenue?: number
}

interface ProductBarChartProps {
  data: ProductData[]
  limit?: number
}

const COLORS = ['#0F766E','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316']

export default function ProductBarChart({ data, limit = 10 }: ProductBarChartProps) {
  if (!data?.length) return (
    <div className="h-full flex items-center justify-center text-sm text-muted">No product data available</div>
  )

  const top = [...data].sort((a, b) => b.total_units - a.total_units).slice(0, limit)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={top} layout="vertical" margin={{ top: 10, right: 24, left: 16, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
        />
        <YAxis
          type="category"
          dataKey="product_name"
          tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          width={130}
          tickFormatter={(v) => v?.length > 16 ? v.slice(0, 16) + '…' : (v || 'Unknown')}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(v: number) => [`${v.toLocaleString()} units`, 'Units Sold']}
        />
        <Bar dataKey="total_units" maxBarSize={36} radius={[0, 6, 6, 0]}>
          {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
