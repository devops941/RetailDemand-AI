import { ReactNode } from 'react'
import { clsx } from 'clsx'
import LoadingSkeleton from '../common/LoadingSkeleton'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  loading?: boolean
  className?: string
  action?: ReactNode
  height?: number
}

export default function ChartCard({
  title, description, children, loading, className, action, height = 300
}: ChartCardProps) {
  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {loading ? (
        <div style={{ height }} className="flex items-center justify-center">
          <LoadingSkeleton className="h-full w-full" />
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  )
}
