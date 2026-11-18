import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts'

interface CategoryData {
  category: string
  total_units: number
  share_pct?: number
}

const COLORS = ['#0F766E','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4']

export default function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (!data?.length) return (
    <div className="h-full flex items-center justify-center text-sm text-muted">No category data available</div>
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 10, left: 10, bottom: 20 }}>
        <Pie
          data={data}
          dataKey="total_units"
          nameKey="category"
          cx="50%"
          cy="42%"
          outerRadius={75}
          innerRadius={42}
          paddingAngle={3}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(v: number, name: string) => [`${v.toLocaleString()} units`, name]}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
