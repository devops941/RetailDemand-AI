import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple'
  loading?: boolean
}

const colorMap = {
  primary: 'bg-teal-50 text-teal-700',
  green: 'bg-green-50 text-green-700',
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-700',
}

export default function StatCard({ title, value, icon: Icon, trend, color = 'primary', loading }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{title}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 bg-slate-200 animate-pulse rounded" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          )}
          {trend && (
            <p className={clsx('mt-1 text-xs', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', colorMap[color])}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
