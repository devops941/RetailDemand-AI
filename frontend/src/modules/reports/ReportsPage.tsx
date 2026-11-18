import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  FileSpreadsheet,
  Download,
  TrendingUp,
  Brain,
  Database,
  BarChart3,
} from 'lucide-react'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../store/toastStore'
import type { Dataset, MLModel } from '../../types'

interface PastForecast {
  scenario_id: string
  forecast_id: string | null
  scenario_name: string
  product_id: string
  start_date: string
  end_date: string
}
interface APIEnvelope<T> {
  data: T
}

type ExportFormat = 'csv' | 'excel'

const FORMAT_EXT: Record<ExportFormat, string> = { csv: 'csv', excel: 'xlsx' }

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function FormatToggle({
  value,
  onChange,
}: {
  value: ExportFormat
  onChange: (f: ExportFormat) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
      {(['csv', 'excel'] as ExportFormat[]).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${
            value === f
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {f === 'csv' ? <FileText size={12} /> : <FileSpreadsheet size={12} />}
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

interface ReportCardProps {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}

function ReportCard({ icon: Icon, title, description, children }: ReportCardProps) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-50 rounded-lg shrink-0">
          <Icon size={18} className="text-primary-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-3">{children}</div>
    </div>
  )
}

export default function ReportsPage() {
  const toast = useToast()
  const user = useAuthStore((s) => s.user)

  const [forecastId, setForecastId] = useState('')
  const [forecastFmt, setForecastFmt] = useState<ExportFormat>('csv')
  const [datasetId, setDatasetId] = useState('')
  const [modelFmt, setModelFmt] = useState<ExportFormat>('csv')
  const [analyticsDsId, setAnalyticsDsId] = useState('')
  const [analyticsGran, setAnalyticsGran] = useState<'daily' | 'monthly'>('monthly')
  const [analyticsFmt, setAnalyticsFmt] = useState<ExportFormat>('csv')

  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecasts', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<PastForecast[]>>('/forecasts/').then((r) => r.data.data),
  })

  const { data: allDatasets = [] } = useQuery({
    queryKey: ['datasets', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<Dataset[]>>('/datasets/').then((r) => r.data.data),
  })
  const processedDatasets = allDatasets.filter((d) => d.status === 'processed')

  const { data: models = [] } = useQuery({
    queryKey: ['models', user?.id],
    queryFn: () =>
      api.get<APIEnvelope<MLModel[]>>('/models/').then((r) => r.data.data),
  })

  const download = async (
    key: string,
    endpoint: string,
    filename: string,
  ) => {
    setDownloading(key)
    try {
      const res = await api.get(endpoint, { responseType: 'blob' })
      downloadBlob(res.data as Blob, filename)
      toast.success(`Downloaded ${filename}`)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const DownloadBtn = ({
    id,
    onClick,
    disabled,
  }: {
    id: string
    onClick: () => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || downloading === id}
      className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading === id ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
      ) : (
        <Download size={15} />
      )}
      {downloading === id ? 'Downloading...' : 'Download'}
    </button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Export forecasts, datasets, model metrics, and analytics as CSV or Excel"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Forecast Export */}
        <ReportCard
          icon={TrendingUp}
          title="Forecast Export"
          description="Download a saved forecast with daily predictions and revenue projections."
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Select Forecast
            </label>
            <select
              value={forecastId}
              onChange={(e) => setForecastId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">
                {forecasts.length === 0
                  ? 'No forecasts available'
                  : 'Select a forecast'}
              </option>
              {forecasts.map((f) => (
                <option
                  key={f.scenario_id}
                  value={f.forecast_id ?? ''}
                  disabled={!f.forecast_id}
                >
                  {f.scenario_name} ({f.start_date} → {f.end_date})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <FormatToggle value={forecastFmt} onChange={setForecastFmt} />
            <DownloadBtn
              id="forecast"
              disabled={!forecastId}
              onClick={() =>
                download(
                  'forecast',
                  `/reports/forecast/${forecastId}?format=${forecastFmt}`,
                  `forecast_${forecastId.slice(0, 8)}.${FORMAT_EXT[forecastFmt]}`,
                )
              }
            />
          </div>
        </ReportCard>

        {/* Dataset Export */}
        <ReportCard
          icon={Database}
          title="Dataset Export"
          description="Download a processed dataset with cleaned, normalized columns."
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Select Processed Dataset
            </label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">
                {processedDatasets.length === 0
                  ? 'No processed datasets'
                  : 'Select a dataset'}
              </option>
              {processedDatasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count?.toLocaleString() ?? '?'} rows)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted flex items-center gap-1">
              <FileText size={12} />
              CSV format
            </span>
            <DownloadBtn
              id="dataset"
              disabled={!datasetId}
              onClick={() =>
                download(
                  'dataset',
                  `/reports/dataset/${datasetId}`,
                  `dataset_${datasetId.slice(0, 8)}_processed.csv`,
                )
              }
            />
          </div>
        </ReportCard>

        {/* Model Metrics */}
        <ReportCard
          icon={Brain}
          title="Model Metrics"
          description={`Export all ${models.length} model(s) with MAE, RMSE, MAPE, R², and WAPE metrics.`}
        >
          <div className="text-xs text-muted">
            Includes all models you have access to with their evaluation metrics
            and training configuration.
          </div>
          <div className="flex items-center justify-between">
            <FormatToggle value={modelFmt} onChange={setModelFmt} />
            <DownloadBtn
              id="models"
              disabled={models.length === 0}
              onClick={() =>
                download(
                  'models',
                  `/reports/models?format=${modelFmt}`,
                  `model_metrics.${FORMAT_EXT[modelFmt]}`,
                )
              }
            />
          </div>
        </ReportCard>

        {/* Analytics Trends */}
        <ReportCard
          icon={BarChart3}
          title="Analytics Trends"
          description="Export aggregated sales trends (units sold, revenue) over time."
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Select Dataset
            </label>
            <select
              value={analyticsDsId}
              onChange={(e) => setAnalyticsDsId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">
                {processedDatasets.length === 0
                  ? 'No processed datasets'
                  : 'Select a dataset'}
              </option>
              {processedDatasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              {(['daily', 'monthly'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setAnalyticsGran(g)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    analyticsGran === g
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <FormatToggle value={analyticsFmt} onChange={setAnalyticsFmt} />
          </div>
          <div className="flex justify-end">
            <DownloadBtn
              id="analytics"
              disabled={!analyticsDsId}
              onClick={() =>
                download(
                  'analytics',
                  `/reports/analytics?dataset_id=${analyticsDsId}&granularity=${analyticsGran}&format=${analyticsFmt}`,
                  `analytics_${analyticsGran}.${FORMAT_EXT[analyticsFmt]}`,
                )
              }
            />
          </div>
        </ReportCard>
      </div>

      {/* Quick summary */}
      <div className="card bg-slate-50 border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Available Data Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Forecasts', value: forecasts.length, icon: TrendingUp },
            { label: 'Datasets', value: processedDatasets.length, icon: Database },
            { label: 'Models', value: models.length, icon: Brain },
            {
              label: 'Total Rows',
              value: processedDatasets
                .reduce((s, d) => s + (d.row_count ?? 0), 0)
                .toLocaleString(),
              icon: BarChart3,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={16} className="text-slate-400" />
              <span className="text-lg font-bold text-slate-800">{value}</span>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
