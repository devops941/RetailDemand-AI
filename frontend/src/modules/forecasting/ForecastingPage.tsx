import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart3, Trash2, Eye, TrendingUp, DollarSign, Calendar, Package, GitCompareArrows } from 'lucide-react'
import { forecastService, type ForecastPayload } from '../../services/forecastService'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../store/toastStore'
import type { MLModel, ModelMetrics } from '../../types'

interface ModelWithMetrics extends MLModel {
  metrics?: ModelMetrics
  dataset_id: string
}

interface ProductItem {
  product_id: string
  product_name?: string
}

interface DayPrediction {
  date: string
  predicted_units: number
  expected_revenue?: number
}

interface ForecastResult {
  forecast_id: string
  scenario_id: string
  scenario_name?: string | null
  product_id: string
  model_id: string
  daily_predictions: DayPrediction[]
  total_predicted_units: number
  total_predicted_revenue: number
  avg_daily_units: number
  days_forecasted: number
  model_mae?: number | null
  model_rmse?: number | null
}

interface PastForecast {
  scenario_id: string
  forecast_id: string | null
  scenario_name: string
  product_id: string
  start_date: string
  end_date: string
  total_predicted_units?: number | null
  total_predicted_revenue?: number | null
  created_at: string
}

interface APIEnvelope<T> { data: T }

const PROMOTION_TYPES = [
  { value: '', label: 'None' },
  { value: 'BOGO', label: 'Buy One Get One' },
  { value: 'Bundle', label: 'Bundle Deal' },
  { value: 'Seasonal', label: 'Seasonal' },
  { value: 'Clearance', label: 'Clearance' },
  { value: 'Flash Sale', label: 'Flash Sale' },
  { value: 'Loyalty', label: 'Loyalty Reward' },
]

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className="p-2 bg-primary-50 rounded-lg shrink-0">
        <Icon size={18} className="text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 truncate">{value}</p>
        {sub && <p className="text-xs text-muted truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function ForecastingPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()
  const qStart = searchParams.get('start')
  const qEnd = searchParams.get('end')
  const qProduct = searchParams.get('product')

  const [selectedModelId, setSelectedModelId] = useState('')
  const [form, setForm] = useState({
    product_id: '',
    start_date: '',
    end_date: '',
    unit_price: 10,
    discount_percentage: 0,
    promotion_type: '',
    holiday_indicator: false,
    scenario_name: '',
  })
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [showTable, setShowTable] = useState(false)

  const { data: allModels = [] } = useQuery({
    queryKey: ['models', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<ModelWithMetrics[]>>('/models/').then((r) => r.data.data),
  })
  const models = allModels.filter((m) =>
    ['trained', 'active', 'archived'].includes(m.status),
  )
  const selectedModel = models.find((m) => m.id === selectedModelId)

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-list', selectedModel?.dataset_id],
    queryFn: () =>
      api
        .get<APIEnvelope<ProductItem[]>>(
          `/analytics/products-list?dataset_id=${selectedModel!.dataset_id}`,
        )
        .then((r) => r.data.data),
    enabled: !!selectedModel?.dataset_id,
  })

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id)
    }
  }, [models, selectedModelId])

  useEffect(() => {
    if (products.length > 0 && (!form.product_id || !products.some((p) => p.product_id === form.product_id))) {
      setForm((prev) => ({ ...prev, product_id: products[0].product_id }))
    }
  }, [products, form.product_id])

  useEffect(() => {
    if (qStart && qEnd) {
      setForm((p) => ({
        ...p,
        start_date: qStart,
        end_date: qEnd,
        product_id: qProduct || p.product_id,
        scenario_name: p.scenario_name || `Backtest ${qProduct || 'Product'} (${qStart} to ${qEnd})`,
      }))
    }
  }, [qStart, qEnd, qProduct])

  const { data: pastForecasts = [] } = useQuery({
    queryKey: ['forecasts', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<PastForecast[]>>('/forecasts/').then((r) => r.data.data),
  })

  const forecastMut = useMutation({
    mutationFn: (payload: ForecastPayload) => forecastService.predict(payload),
    onSuccess: (res) => {
      const d = (res.data as APIEnvelope<ForecastResult>).data
      setResult(d)
      setShowTable(false)
      toast.success(
        `Forecast complete — ${d.total_predicted_units.toFixed(0)} units over ${d.days_forecasted} days`,
      )
      qc.invalidateQueries({ queryKey: ['forecasts'] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Forecast failed')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (sid: string) => forecastService.delete(sid),
    onSuccess: () => {
      toast.success('Forecast deleted')
      qc.invalidateQueries({ queryKey: ['forecasts'] })
    },
    onError: () => toast.error('Failed to delete forecast'),
  })

  const viewMut = useMutation({
    mutationFn: (fid: string) => forecastService.get(fid),
    onSuccess: (res) => {
      const raw = (res.data as APIEnvelope<ForecastResult>).data
      setResult({
        ...raw,
        avg_daily_units:
          raw.avg_daily_units ??
          raw.total_predicted_units / Math.max(raw.daily_predictions.length, 1),
        days_forecasted: raw.days_forecasted ?? raw.daily_predictions.length,
      })
      setShowTable(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: () => toast.error('Failed to load forecast'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModelId) { toast.error('Select a model'); return }
    if (!form.product_id) { toast.error('Select a product'); return }
    if (!form.start_date || !form.end_date) {
      toast.error('Enter a date range')
      return
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error('End date must be after start date')
      return
    }
    forecastMut.mutate({
      model_id: selectedModelId,
      product_id: form.product_id,
      start_date: form.start_date,
      end_date: form.end_date,
      unit_price: form.unit_price,
      discount_percentage: form.discount_percentage,
      promotion_type: form.promotion_type || undefined,
      holiday_indicator: form.holiday_indicator,
      scenario_name: form.scenario_name || undefined,
    })
  }

  const chartData =
    result?.daily_predictions.map((d) => ({
      date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      units: Math.round(d.predicted_units),
      revenue: d.expected_revenue ? Math.round(d.expected_revenue) : undefined,
    })) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand Forecasting"
        description="Generate promotion-aware demand forecasts using trained ML models"
      />

      {/* Configure form */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Configure Forecast
        </h2>
        {models.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No trained models available"
            description="Train a model on the ML Models page before generating forecasts."
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => {
                    setSelectedModelId(e.target.value)
                    setForm((p) => ({ ...p, product_id: '' }))
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select a model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.algorithm.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product
                </label>
                <select
                  value={form.product_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, product_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  disabled={!selectedModelId}
                  required
                >
                  <option value="">
                    {!selectedModelId
                      ? 'Select a model first'
                      : isProductsLoading
                      ? 'Loading products...'
                      : products.length === 0
                      ? 'No products found'
                      : 'Select a product'}
                  </option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name ?? p.product_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scenario Name{' '}
                  <span className="text-slate-400">(opt)</span>
                </label>
                <input
                  type="text"
                  value={form.scenario_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scenario_name: e.target.value }))
                  }
                  placeholder="e.g. Black Friday 2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-emerald-800">💡 Historical Dates in Dataset:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900 font-bold">
                    2024-01-01 → 2024-03-30
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      start_date: '2024-03-01',
                      end_date: '2024-03-15',
                      scenario_name: p.scenario_name || `Backtest ${p.product_id || 'PROD102'} (2024-03-01 to 2024-03-15)`,
                    }))
                  }
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300 shadow-2xs transition-colors flex items-center gap-1"
                >
                  ⚡ Auto-fill 2024 Dates for Forecast vs Actual
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      unit_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.discount_percentage}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      discount_percentage: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Promotion Type
                </label>
                <select
                  value={form.promotion_type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, promotion_type: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {PROMOTION_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Holiday Impact
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer h-[38px]">
                  <input
                    type="checkbox"
                    checked={form.holiday_indicator}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        holiday_indicator: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Festive Holiday Period
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={forecastMut.isPending}
                className="btn btn-primary"
              >
                {forecastMut.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    Run Forecast
                  </span>
                )}
              </button>
              {selectedModel?.metrics && (
                <span className="text-xs text-muted">
                  Model MAE: {selectedModel.metrics.mae.toFixed(2)} · RMSE:{' '}
                  {selectedModel.metrics.rmse.toFixed(2)}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Forecast Results
              {result.scenario_name && (
                <span className="text-muted font-normal ml-2">
                  — {result.scenario_name}
                </span>
              )}
            </h2>
            <Link
              to="/forecast-comparison"
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <GitCompareArrows size={14} />
              View Forecast vs Actual
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Package}
              label="Total Units"
              value={result.total_predicted_units.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}
              sub={`${result.days_forecasted} days`}
            />
            <StatCard
              icon={DollarSign}
              label="Total Revenue"
              value={`$${result.total_predicted_revenue.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}`}
              sub="projected"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Daily Units"
              value={result.avg_daily_units.toFixed(1)}
              sub="per day"
            />
            <StatCard
              icon={Calendar}
              label="Forecast Period"
              value={`${result.days_forecasted}d`}
              sub={result.daily_predictions[0]?.date ?? ''}
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Daily Predicted Units
              </h3>
              {result.model_mae != null && (
                <span className="text-xs text-muted">
                  Model MAE ±{result.model_mae.toFixed(2)} · RMSE ±
                  {result.model_rmse?.toFixed(2)}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="unitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={Math.max(
                    0,
                    Math.floor(chartData.length / 8) - 1,
                  )}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Units',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="units"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#unitsGrad)"
                  dot={chartData.length <= 30 ? { r: 2, fill: '#6366f1' } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <button
              onClick={() => setShowTable((v) => !v)}
              className="flex items-center justify-between w-full text-sm font-semibold text-slate-700"
            >
              <span>
                Daily Predictions ({result.daily_predictions.length} days)
              </span>
              <span className="text-muted text-xs">
                {showTable ? 'Hide ▲' : 'Show ▼'}
              </span>
            </button>
            {showTable && (
              <div className="mt-3 overflow-y-auto max-h-72 rounded border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {['Date', 'Predicted Units', 'Expected Revenue'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.daily_predictions.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{d.date}</td>
                        <td className="px-3 py-2 font-medium">
                          {d.predicted_units.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {d.expected_revenue != null
                            ? `$${d.expected_revenue.toFixed(2)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past forecasts */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Past Forecasts ({pastForecasts.length})
        </h2>
        {pastForecasts.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No forecasts yet"
            description="Run your first forecast above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    'Scenario',
                    'Product',
                    'Period',
                    'Total Units',
                    'Revenue',
                    'Date',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastForecasts.map((f) => {
                  const prod = products.find((p) => p.product_id === f.product_id)
                  const prodLabel = prod?.product_name || f.product_id
                  return (
                    <tr key={f.scenario_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-slate-800 max-w-[160px] truncate">
                        {f.scenario_name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {prodLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {f.start_date} → {f.end_date}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-900">
                        {f.total_predicted_units != null
                          ? Math.round(f.total_predicted_units).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-emerald-700">
                        {f.total_predicted_revenue != null
                          ? `$${Math.round(f.total_predicted_revenue).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {f.forecast_id && (
                            <button
                              onClick={() => viewMut.mutate(f.forecast_id!)}
                              disabled={viewMut.isPending}
                              className="p-1.5 text-slate-500 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                              title="View forecast chart"
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this forecast?'))
                                deleteMut.mutate(f.scenario_id)
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
