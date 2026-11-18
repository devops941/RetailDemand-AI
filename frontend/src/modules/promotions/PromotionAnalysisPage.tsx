import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Tag,
  Plus,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
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
interface ScenarioInput {
  label: string
  discount_percentage: number
  promotion_type: string
  holiday_indicator: boolean
}
interface ScenarioResult {
  label: string
  discount_percentage: number
  promotion_type?: string | null
  holiday_indicator: boolean
  effective_price: number
  total_units: number
  total_revenue: number
  avg_daily_units: number
  lift_vs_baseline_pct: number
  daily_predictions: { date: string; predicted_units: number }[]
}
interface CompareResult {
  model_id: string
  product_id: string
  start_date: string
  end_date: string
  unit_price: number
  days: number
  scenarios: ScenarioResult[]
  best_units_scenario: string
  best_revenue_scenario: string
}
interface APIEnvelope<T> {
  data: T
}
interface ComparePayload {
  model_id: string
  product_id: string
  start_date: string
  end_date: string
  unit_price: number
  scenarios: Array<{
    label: string
    discount_percentage: number
    promotion_type?: string
    holiday_indicator: boolean
  }>
}

const PROMOTION_OPTIONS = [
  '',
  'BOGO',
  'Bundle',
  'Seasonal',
  'Clearance',
  'Flash Sale',
  'Loyalty',
]
const SCENARIO_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#8b5cf6',
  '#f97316',
  '#ec4899',
]
const DEFAULT_SCENARIOS: ScenarioInput[] = [
  {
    label: 'Baseline',
    discount_percentage: 0,
    promotion_type: '',
    holiday_indicator: false,
  },
  {
    label: '5% Off',
    discount_percentage: 5,
    promotion_type: '',
    holiday_indicator: false,
  },
  {
    label: '10% + BOGO',
    discount_percentage: 10,
    promotion_type: 'BOGO',
    holiday_indicator: false,
  },
  {
    label: '20% Off',
    discount_percentage: 20,
    promotion_type: '',
    holiday_indicator: false,
  },
  {
    label: 'Holiday Deal',
    discount_percentage: 15,
    promotion_type: 'Seasonal',
    holiday_indicator: true,
  },
]

function SummaryCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`card p-4 flex items-start gap-3 ${highlight ? 'ring-2 ring-primary-400' : ''}`}
    >
      <div className="p-2 bg-primary-50 rounded-lg shrink-0">
        <Icon size={18} className="text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}

export default function PromotionAnalysisPage() {
  const toast = useToast()
  const user = useAuthStore((s) => s.user)

  const [selectedModelId, setSelectedModelId] = useState('')
  const [form, setForm] = useState({
    product_id: '',
    start_date: '',
    end_date: '',
    unit_price: 25,
  })
  const [scenarios, setScenarios] =
    useState<ScenarioInput[]>(DEFAULT_SCENARIOS)
  const [result, setResult] = useState<CompareResult | null>(null)

  const { data: allModels = [] } = useQuery({
    queryKey: ['models', user?.id],
    queryFn: () =>
      api
        .get<APIEnvelope<ModelWithMetrics[]>>('/models/')
        .then((r) => r.data.data),
  })
  const models = allModels.filter((m) =>
    ['trained', 'active', 'archived'].includes(m.status),
  )
  const selectedModel = models.find((m) => m.id === selectedModelId)

  // Auto-select active or first model
  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      const activeM = models.find((m) => m.status === 'active') || models[0]
      setSelectedModelId(activeM.id)
    }
  }, [models, selectedModelId])

  const { data: products = [] } = useQuery({
    queryKey: ['products-list', selectedModel?.dataset_id],
    queryFn: () =>
      api
        .get<APIEnvelope<ProductItem[]>>(
          `/analytics/products-list?dataset_id=${selectedModel!.dataset_id}`,
        )
        .then((r) => r.data.data),
    enabled: !!selectedModel?.dataset_id,
  })

  // Auto-select first product
  useEffect(() => {
    if (products.length > 0 && (!form.product_id || !products.some((p) => p.product_id === form.product_id))) {
      setForm((prev) => ({ ...prev, product_id: products[0].product_id }))
    }
  }, [products, form.product_id])

  // Auto-fill sensible default dates (today to +14 days)
  useEffect(() => {
    if (!form.start_date || !form.end_date) {
      const today = new Date()
      const future = new Date()
      future.setDate(today.getDate() + 14)
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      setForm((prev) => ({
        ...prev,
        start_date: prev.start_date || fmt(today),
        end_date: prev.end_date || fmt(future),
      }))
    }
  }, [form.start_date, form.end_date])

  const compareMut = useMutation({
    mutationFn: (payload: ComparePayload) =>
      api.post('/promotions/compare', payload),
    onSuccess: (res) => {
      const d = (res.data as APIEnvelope<CompareResult>).data
      setResult(d)
      toast.success(
        `Analysis complete — ${d.scenarios.length} scenarios compared over ${d.days} days`,
      )
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Analysis failed')
    },
  })

  const addScenario = () => {
    if (scenarios.length >= 8) {
      toast.warning('Maximum 8 scenarios')
      return
    }
    setScenarios((p) => [
      ...p,
      {
        label: `Scenario ${p.length + 1}`,
        discount_percentage: 0,
        promotion_type: '',
        holiday_indicator: false,
      },
    ])
  }

  const removeScenario = (i: number) =>
    setScenarios((p) => p.filter((_, idx) => idx !== i))

  const updateScenario = (
    i: number,
    field: keyof ScenarioInput,
    value: string | number | boolean,
  ) => {
    setScenarios((p) =>
      p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    )
  }

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
    if (scenarios.length === 0) { toast.error('Add at least one scenario'); return }

    compareMut.mutate({
      model_id: selectedModelId,
      product_id: form.product_id,
      start_date: form.start_date,
      end_date: form.end_date,
      unit_price: form.unit_price,
      scenarios: scenarios.map((s) => ({
        ...s,
        promotion_type: s.promotion_type || undefined,
      })),
    })
  }

  const unitsBarData = result?.scenarios.map((s) => ({
    label: s.label,
    units: s.total_units,
  }))

  const revenueBarData = result?.scenarios.map((s) => ({
    label: s.label,
    revenue: s.total_revenue,
  }))

  const lineData = useMemo(() => {
    if (!result?.scenarios.length) return []
    const first = result.scenarios[0]
    return first.daily_predictions.map((_, i) => {
      const entry: Record<string, unknown> = {
        date: new Date(
          first.daily_predictions[i].date + 'T00:00:00',
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }
      result.scenarios.forEach((s) => {
        entry[s.label] = Math.round(
          s.daily_predictions[i]?.predicted_units ?? 0,
        )
      })
      return entry
    })
  }, [result])

  const sampledLineData = useMemo(() => {
    if (!lineData.length) return []
    const step = Math.max(1, Math.floor(lineData.length / 60))
    return lineData.filter((_, i) => i % step === 0)
  }, [lineData])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotion Impact Analysis"
        description="Compare how discounts and promotions affect demand across multiple scenarios"
      />

      {/* Configuration */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Configure Analysis
        </h2>
        {models.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No trained models available"
            description="Train a model on the ML Models page before running promotion analysis."
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      {m.name}
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
                      : products.length === 0
                      ? 'Loading...'
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base Unit Price ($)
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
            </div>

            {/* Scenarios editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">
                  Scenarios ({scenarios.length}/8)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScenarios(DEFAULT_SCENARIOS)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={addScenario}
                    className="flex items-center gap-1 text-xs btn btn-secondary py-1 px-2"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Label', 'Discount %', 'Promotion', 'Holiday', ''].map(
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
                    {scenarios.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background:
                                  SCENARIO_COLORS[i % SCENARIO_COLORS.length],
                              }}
                            />
                            <input
                              type="text"
                              value={s.label}
                              onChange={(e) =>
                                updateScenario(i, 'label', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={s.discount_percentage}
                              onChange={(e) =>
                                updateScenario(
                                  i,
                                  'discount_percentage',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <span className="text-muted">%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={s.promotion_type}
                            onChange={(e) =>
                              updateScenario(
                                i,
                                'promotion_type',
                                e.target.value,
                              )
                            }
                            className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {PROMOTION_OPTIONS.map((pt) => (
                              <option key={pt} value={pt}>
                                {pt || 'None'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={s.holiday_indicator}
                            onChange={(e) =>
                              updateScenario(
                                i,
                                'holiday_indicator',
                                e.target.checked,
                              )
                            }
                            className="w-4 h-4 text-primary-600 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeScenario(i)}
                            disabled={scenarios.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={compareMut.isPending}
                className="btn-primary shadow-sm flex items-center gap-2 py-2.5 px-5 font-semibold text-sm"
              >
                {compareMut.isPending ? (
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
                    Simulating {scenarios.length} Scenarios...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} />
                    Run Promotion Analysis
                  </span>
                )}
              </button>
              <p className="text-xs text-muted">
                Runs AI simulation across {scenarios.length} scenarios.
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-slate-800">
            Analysis Results —{' '}
            <span className="text-muted font-normal">
              {result.days} days · {result.scenarios.length} scenarios
            </span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={Package}
              label="Best Units Scenario"
              value={result.best_units_scenario}
              highlight
            />
            <SummaryCard
              icon={DollarSign}
              label="Best Revenue Scenario"
              value={result.best_revenue_scenario}
              highlight
            />
            <SummaryCard
              icon={TrendingUp}
              label="Max Lift vs Baseline"
              value={
                Math.max(
                  ...result.scenarios.map((s) => s.lift_vs_baseline_pct),
                ).toFixed(1) + '%'
              }
            />
            <SummaryCard
              icon={Tag}
              label="Baseline Units"
              value={
                result.scenarios[0]?.total_units.toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                }) ?? '—'
              }
            />
          </div>

          {/* Bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Total Units by Scenario
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={unitsBarData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                    formatter={(v: number) => [v.toLocaleString(), 'Units']}
                  />
                  <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                    {result.scenarios.map((_, i) => (
                      <Cell
                        key={i}
                        fill={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Total Revenue by Scenario ($)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={revenueBarData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                    tickFormatter={(v: number) =>
                      v >= 1000
                        ? `$${(v / 1000).toFixed(0)}k`
                        : `$${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                    formatter={(v: number) => [
                      `$${v.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}`,
                      'Revenue',
                    ]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {result.scenarios.map((_, i) => (
                      <Cell
                        key={i}
                        fill={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily trends multi-line */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Daily Predicted Units — All Scenarios
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={sampledLineData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  interval={Math.max(
                    0,
                    Math.floor(sampledLineData.length / 8) - 1,
                  )}
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
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="line"
                />
                {result.scenarios.map((s, i) => (
                  <Line
                    key={s.label}
                    type="monotone"
                    dataKey={s.label}
                    stroke={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison table */}
          <div className="card overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Scenario Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {[
                      'Scenario',
                      'Discount',
                      'Promotion',
                      'Eff. Price',
                      'Total Units',
                      'Revenue',
                      'Avg Daily',
                      'Lift vs Baseline',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.scenarios.map((s, i) => {
                    const isBestUnits = s.label === result.best_units_scenario
                    const isBestRevenue =
                      s.label === result.best_revenue_scenario
                    return (
                      <tr
                        key={s.label}
                        className={`hover:bg-slate-50 ${i === 0 ? 'bg-slate-50/50' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background:
                                  SCENARIO_COLORS[i % SCENARIO_COLORS.length],
                              }}
                            />
                            <span className="font-medium">{s.label}</span>
                            {i === 0 && (
                              <span className="text-xs text-muted">
                                (baseline)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {s.discount_percentage}%
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {s.promotion_type ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          ${s.effective_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              isBestUnits ? 'font-bold text-primary-700' : ''
                            }
                          >
                            {s.total_units.toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                            {isBestUnits && (
                              <span className="ml-1 text-xs text-primary-500">
                                ★
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              isBestRevenue
                                ? 'font-bold text-emerald-700'
                                : ''
                            }
                          >
                            $
                            {s.total_revenue.toLocaleString('en-US', {
                              maximumFractionDigits: 0,
                            })}
                            {isBestRevenue && (
                              <span className="ml-1 text-xs text-emerald-500">
                                ★
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {s.avg_daily_units.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5">
                          {i === 0 ? (
                            <span className="text-muted text-xs">—</span>
                          ) : (
                            <span
                              className={
                                s.lift_vs_baseline_pct > 0
                                  ? 'text-emerald-600 font-medium'
                                  : 'text-red-500 font-medium'
                              }
                            >
                              {s.lift_vs_baseline_pct > 0 ? '+' : ''}
                              {s.lift_vs_baseline_pct.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
