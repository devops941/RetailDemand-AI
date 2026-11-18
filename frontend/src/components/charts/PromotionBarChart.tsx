import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'

interface PromotionData {
  promotion_type?: string
  discount_tier?: string
  total_units: number
  avg_units?: number
}

const COLORS = ['#64748b','#0F766E','#0ea5e9','#8b5cf6','#f59e0b','#10b981']

interface Props {
  data: PromotionData[]
  xKey?: string
  title?: string
}

export default function PromotionBarChart({ data, xKey = 'promotion_type' }: Props) {
  if (!data?.length) return (
    <div className="h-full flex items-center justify-center text-sm text-muted">No data available</div>
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          angle={-15}
          textAnchor="end"
        />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v: number) => [v.toLocaleString(), 'Total Units']}
        />
        <Bar dataKey="total_units" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
