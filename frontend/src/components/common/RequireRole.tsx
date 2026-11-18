import { useAuthStore } from '../../store/authStore'
import type { ReactNode } from 'react'

interface RequireRoleProps {
  roles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export default function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
