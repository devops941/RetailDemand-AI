import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import {
  LayoutDashboard, Database, TrendingUp, Brain, BarChart3,
  Tag, FileText, LogOut, X, GitCompareArrows
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Datasets', path: '/datasets', icon: Database },
  { label: 'Trend Explorer', path: '/trends', icon: TrendingUp },
  { label: 'ML Models', path: '/models', icon: Brain },
  { label: 'Forecasting', path: '/forecasting', icon: BarChart3 },
  { label: 'Forecast vs Actual', path: '/forecast-comparison', icon: GitCompareArrows },
  { label: 'Promotion Analysis', path: '/promotions', icon: Tag },
  { label: 'Reports', path: '/reports', icon: FileText },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      try { await authService.logout(refreshToken) } catch { /* ignore */ }
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-secondary flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          !open && 'lg:w-0 lg:overflow-hidden',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm leading-tight">
              RetailDemand<br /><span className="text-primary-400 text-xs">AI Platform</span>
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white',
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User + Logout */}
        <div className="border-t border-slate-700 p-3">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white text-sm transition-colors mb-1"
          >
            <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
