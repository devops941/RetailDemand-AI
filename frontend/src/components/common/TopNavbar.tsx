import { Menu, Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/datasets': 'Datasets',
  '/datasets/upload': 'Upload Dataset',
  '/trends': 'Trend Explorer',
  '/models': 'ML Models',
  '/forecasting': 'Demand Forecasting',
  '/promotions': 'Promotion Analysis',
  '/reports': 'Reports',
  '/profile': 'Profile',
  '/settings': 'Settings',
}

interface TopNavbarProps {
  onMenuClick: () => void
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'RetailDemand AI'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-lg font-semibold text-slate-900 flex-1">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-bold">
          {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}
