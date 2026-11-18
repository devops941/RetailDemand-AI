import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitCompareArrows, AlertTriangle, ArrowRight, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import { useAuthStore } from '../../store/authStore'

interface PastForecast {
  scenario_id: string
  forecast_id: string | null
  scenario_name: string
  product_id: string
  start_date: string
  end_date: string
  total_predicted_units: number | null
}

interface ComparisonSeries {
  date: string
  predicted: number | null
  actual: number | null
}

interface ComparisonResult {
  forecast_id: string
  scenario_name: string | null
  product_id: string
  series: ComparisonSeries[]
  has_actual: boolean
  dataset_start_date?: string | null
  dataset_end_date?: string | null
  scenario_start_date?: string | null
  scenario_end_date?: string | null
  overlap_days: number
  computed_mae: number | null
  computed_mape: number | null
  model_mae: number | null
  model_rmse: number | null
  total_predicted: number
  total_actual: number | null
}

interface APIEnvelope<T> {
  data: T
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 text-center border-slate-200 shadow-2xs hover:shadow-sm transition-shadow">
      <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{label}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export default function ForecastComparisonPage() {
  const user = useAuthStore((s) => s.user)
  const [forecastId, setForecastId] = useState('')

  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecasts', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<PastForecast[]>>('/forecasts/').then((r) => r.data.data),
  })

  const eligibleForecasts = forecasts.filter((f) => f.forecast_id !== null)

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['forecast-comparison', forecastId],
    queryFn: () =>
      api
        .get<APIEnvelope<ComparisonResult>>(`/forecasts/${forecastId}/comparison`)
        .then((r) => r.data.data),
    enabled: !!forecastId,
  })

  useEffect(() => {
    if (!forecastId && eligibleForecasts.length > 0) {
      setForecastId(eligibleForecasts[0].forecast_id!)
    }
  }, [eligibleForecasts, forecastId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecast vs Actual"
        description="Overlay predicted values against historical actuals to evaluate model accuracy"
      />

      <div className="card p-5 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select Active Forecast
          </label>
          <span className="text-xs text-slate-400">
            {eligibleForecasts.length} past forecast{eligibleForecasts.length === 1 ? '' : 's'} recorded
          </span>
        </div>
        <select
          value={forecastId}
          onChange={(e) => setForecastId(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 hover:bg-white transition-colors"
        >
          <option value="">
            {eligibleForecasts.length === 0
              ? 'No forecasts available yet'
              : 'Choose a forecast to compare...'}
          </option>
          {eligibleForecasts.map((f) => (
            <option key={f.scenario_id} value={f.forecast_id!}>
              {f.scenario_name} — Product: {f.product_id} ({f.start_date} → {f.end_date})
            </option>
          ))}
        </select>

        {eligibleForecasts.length > 1 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted font-medium">Quick switch:</span>
            {eligibleForecasts.slice(0, 4).map((f) => (
              <button
                key={f.scenario_id}
                onClick={() => setForecastId(f.forecast_id!)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  forecastId === f.forecast_id
                    ? 'bg-primary-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.scenario_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!forecastId && (
        <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200">
          <div className="p-4 bg-slate-100 rounded-full mb-3 text-slate-400">
            <GitCompareArrows size={36} />
          </div>
          <p className="text-base font-semibold text-slate-700">
            {eligibleForecasts.length === 0 ? 'No Forecasts Available' : 'Select a Forecast to Compare'}
          </p>
          <p className="text-xs text-muted mt-1 max-w-sm">
            {eligibleForecasts.length === 0
              ? 'Run your first demand forecast to compare predicted quantities against realized historical sales.'
              : 'Choose one of your saved scenarios above to inspect the model prediction accuracy over time.'}
          </p>
          {eligibleForecasts.length === 0 && (
            <Link
              to="/forecasting"
              className="mt-4 btn-primary text-xs py-2 px-4 flex items-center gap-2"
            >
              <BarChart2 size={15} />
              Go to Forecasting
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {forecastId && isLoading && (
        <div className="card flex items-center justify-center py-12">
          <span className="text-sm text-muted">Loading comparison data...</span>
        </div>
      )}

      {forecastId && comparison && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Predicted"
              value={comparison.total_predicted.toLocaleString()}
            />
            <StatCard
              label="Total Actual"
              value={
                comparison.total_actual !== null
                  ? comparison.total_actual.toLocaleString()
                  : 'No data'
              }
            />
            <StatCard
              label="Computed MAE"
              value={comparison.computed_mae !== null ? comparison.computed_mae.toFixed(2) : 'N/A'}
            />
            <StatCard
              label="MAPE"
              value={
                comparison.computed_mape !== null
                  ? `${comparison.computed_mape.toFixed(1)}%`
                  : 'N/A'
              }
            />
          </div>

          {!comparison.has_actual && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle size={18} className="text-amber-600" />
                <span>No Historical Actual Sales Found for This Date Range</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                This forecast was generated for{' '}
                <strong className="font-mono bg-amber-100/70 px-1.5 py-0.5 rounded">
                  {comparison.scenario_start_date || 'future dates'} → {comparison.scenario_end_date || 'future dates'}
                </strong>
                . Because this period is in the future, actual store sales have not occurred yet.
              </p>
              {comparison.dataset_start_date && comparison.dataset_end_date && (
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-amber-200/60 text-xs">
                  <div>
                    <span className="text-amber-700">Available Historical Dates in Dataset: </span>
                    <strong className="font-mono font-bold text-amber-900">
                      {comparison.dataset_start_date} → {comparison.dataset_end_date}
                    </strong>
                  </div>
                  <Link
                    to={`/forecasting?start=${comparison.dataset_start_date}&end=${comparison.dataset_end_date}&product=${comparison.product_id}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  >
                    Run Backtest with Historical Dates <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                {comparison.scenario_name ?? 'Forecast'} — Predicted vs Actual
              </h3>
              {comparison.overlap_days > 0 && (
                <span className="text-xs text-muted">
                  Metrics on {comparison.overlap_days} overlapping day
                  {comparison.overlap_days !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={comparison.series}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) =>
                    value != null ? Number(value).toFixed(1) : 'N/A'
                  }
                />
                <Legend />
                <Line
                  name="Predicted"
                  dataKey="predicted"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  name="Actual"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {(comparison.model_mae !== null || comparison.model_rmse !== null) && (
            <div className="card bg-slate-50 border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Model Validation Metrics (from training)
              </p>
              <div className="flex gap-6 text-sm">
                {comparison.model_mae !== null && (
                  <div>
                    <span className="text-muted text-xs">MAE </span>
                    <span className="font-medium">{comparison.model_mae.toFixed(4)}</span>
                  </div>
                )}
                {comparison.model_rmse !== null && (
                  <div>
                    <span className="text-muted text-xs">RMSE </span>
                    <span className="font-medium">{comparison.model_rmse.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
