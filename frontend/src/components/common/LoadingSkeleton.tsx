import { clsx } from 'clsx'

interface LoadingSkeletonProps {
  className?: string
  rows?: number
}

export default function LoadingSkeleton({ className, rows = 1 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={clsx('bg-slate-200 animate-pulse rounded', className ?? 'h-4 w-full')} />
      ))}
    </div>
  )
}
