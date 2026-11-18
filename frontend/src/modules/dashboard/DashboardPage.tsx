import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { dashboardService } from '../../services/dashboardService'
import StatCard from '../../components/common/StatCard'
import PageHeader from '../../components/common/PageHeader'
import {
  Database,
  Brain,
  BarChart3,
  Package,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Upload,
  GitCompareArrows,
  Tag,
  FileText,
} from 'lucide-react'
import type { DashboardOverview } from '../../types'

const steps = [
  { step: 1, title: 'Upload a Dataset', desc: 'Upload a CSV or XLSX file with your sales history', path: '/datasets/upload', cta: 'Upload Now' },
  { step: 2, title: 'Validate & Process', desc: 'Clean the data and prepare it for ML training', path: '/datasets', cta: 'View Datasets' },
  { step: 3, title: 'Train a Model', desc: 'Choose an algorithm and train on your data', path: '/models', cta: 'Go to Models' },
  { step: 4, title: 'Generate Forecasts', desc: 'Predict demand with custom promotion scenarios', path: '/forecasting', cta: 'Start Forecasting' },
]

const navCards = [
  {
    title: 'Datasets',
    desc: 'Upload, validate, and clean historical sales CSV/Excel files',
    path: '/datasets',
    icon: Database,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    title: 'Trend Explorer',
    desc: 'Explore historical sales trends, product performance, and categories',
    path: '/trends',
    icon: TrendingUp,
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    title: 'ML Models',
    desc: 'Train, evaluate, and manage demand forecasting models with live metrics',
    path: '/models',
    icon: Brain,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    title: 'Demand Forecasting',
    desc: 'Generate promotion-aware demand forecasts for upcoming dates',
    path: '/forecasting',
    icon: BarChart3,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    title: 'Forecast vs Actual',
    desc: 'Overlay predicted values against historical actuals to evaluate accuracy',
    path: '/forecast-comparison',
    icon: GitCompareArrows,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    title: 'Promotion Analysis',
    desc: 'Simulate how discounts, holidays, and promotions impact demand',
    path: '/promotions',
    icon: Tag,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    title: 'Reports & Exports',
    desc: 'Download forecasts, processed datasets, and model metrics as CSV/Excel',
    path: '/reports',
    icon: FileText,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview', user?.id],
    queryFn: () => dashboardService.getOverview().then((r) => r.data.data as DashboardOverview),
  })

  const hasData = (overview?.total_datasets ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your retail demand forecasting operations"
        action={
          <Link to="/datasets/upload" className="btn-primary flex items-center gap-2">
            <Upload size={16} /> Upload Dataset
          </Link>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/datasets" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="Datasets" value={overview?.total_datasets ?? 0} icon={Database} color="primary" loading={isLoading} />
        </Link>
        <Link to="/models" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="ML Models" value={overview?.total_models ?? 0} icon={Brain} color="blue" loading={isLoading} />
        </Link>
        <Link to="/forecasting" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="Forecasts" value={overview?.total_forecasts ?? 0} icon={BarChart3} color="green" loading={isLoading} />
        </Link>
        <Link to="/trends" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="Products" value={overview?.total_products ?? 0} icon={Package} color="orange" loading={isLoading} />
        </Link>
        <Link to="/datasets" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="Sales Records" value={overview?.total_sales_records ?? 0} icon={ShoppingCart} color="purple" loading={isLoading} />
        </Link>
        <Link to="/trends" className="block hover:scale-[1.01] transition-transform">
          <StatCard title="Units Sold" value={overview?.total_units_sold ?? 0} icon={TrendingUp} color="primary" loading={isLoading} />
        </Link>
      </div>

      {!hasData && !isLoading && (
        /* Getting started wizard */
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Getting Started</h3>
          <p className="text-sm text-muted mb-5">Follow these steps to generate your first demand forecast.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s) => (
              <div key={s.step} className="border border-slate-200 rounded-xl p-4 hover:border-primary-700 hover:bg-teal-50/30 transition-colors group">
                <div className="w-7 h-7 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center mb-3">
                  {s.step}
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">{s.title}</h4>
                <p className="text-xs text-muted mb-3 leading-relaxed">{s.desc}</p>
                <Link to={s.path} className="text-xs text-primary-700 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {s.cta} <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Navigation Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Platform Navigation</h3>
          <span className="text-xs text-muted">Quick shortcuts to all forecasting and analysis modules</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {navCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.path}
                to={card.path}
                className="card p-4 hover:shadow-md transition-all group flex flex-col justify-between border-slate-200 hover:border-primary-500 bg-white"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${card.color}`}>
                      <Icon size={18} />
                    </div>
                    <ArrowRight size={15} className="text-slate-400 group-hover:text-primary-700 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-primary-700 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-primary-700 group-hover:text-primary-800">
                  Open Module →
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
