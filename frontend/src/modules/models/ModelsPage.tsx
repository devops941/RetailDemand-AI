import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Star, Trash2, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { modelService, type TrainRequest } from '../../services/modelService'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../store/toastStore'
import type { Dataset, MLModel, ModelMetrics } from '../../types'

interface ModelWithMetrics extends MLModel {
  metrics?: ModelMetrics
  training_start_date?: string
  training_end_date?: string
  product_ids?: string[]
}

interface APIEnvelope<T> {
  data: T
}

const ALGORITHMS = [
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'linear_regression', label: 'Linear Regression' },
  { value: 'gradient_boosting', label: 'Gradient Boosting' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200',
    trained: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200',
    training: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse',
    failed: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200',
    archived: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600',
  }
  return <span className={map[status] ?? 'badge badge-green'}>{status.toUpperCase()}</span>
}

function MetricChip({
  label,
  value,
}: {
  label: string
  value: number | null | undefined
}) {
  if (value == null) return null
  const isNegativeR2 = label === 'R²' && value < 0
  const displayVal = isNegativeR2 ? '< 0.00' : value.toFixed(2)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs shadow-2xs">
      <span className="font-semibold text-slate-500 uppercase tracking-wide">{label}:</span>
      <span className={`font-bold font-mono ${isNegativeR2 ? 'text-amber-600' : 'text-slate-800'}`}>
        {displayVal}
      </span>
    </span>
  )
}

export default function ModelsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [form, setForm] = useState<TrainRequest>({
    dataset_id: '',
    algorithm: 'random_forest',
    name: '',
    training_start_date: '',
    training_end_date: '',
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets', user?.id],
    queryFn: () =>
      api
        .get<APIEnvelope<Dataset[]>>('/datasets/')
        .then((r) => r.data.data),
  })
  const processedDatasets = datasets.filter((d) => d.status === 'processed')

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['models', user?.id],
    queryFn: () =>
      api
        .get<APIEnvelope<ModelWithMetrics[]>>('/models/')
        .then((r) => r.data.data),
  })

  const trainMut = useMutation({
    mutationFn: (data: TrainRequest) => modelService.train(data),
    onSuccess: (res) => {
      const d = (res.data as { data: { metrics: ModelMetrics } }).data
      const mae = d.metrics?.mae
      toast.success(`Model trained! MAE: ${mae != null ? mae.toFixed(2) : '—'}`)
      qc.invalidateQueries({ queryKey: ['models'] })
      setForm({
        dataset_id: '',
        algorithm: 'random_forest',
        name: '',
        training_start_date: '',
        training_end_date: '',
      })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Training failed')
    },
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => modelService.activate(id),
    onSuccess: () => {
      toast.success('Model activated')
      qc.invalidateQueries({ queryKey: ['models'] })
    },
    onError: () => toast.error('Failed to activate model'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => modelService.delete(id),
    onSuccess: () => {
      toast.success('Model deleted')
      qc.invalidateQueries({ queryKey: ['models'] })
    },
    onError: () => toast.error('Failed to delete model'),
  })

  const handleTrain = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dataset_id || !form.name) {
      toast.error('Dataset and model name are required')
      return
    }
    const payload: TrainRequest = {
      ...form,
      training_start_date: form.training_start_date || undefined,
      training_end_date: form.training_end_date || undefined,
    }
    trainMut.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ML Models"
        description="Train and manage demand forecasting models"
      />

      {/* Train form */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Train New Model
        </h2>
        {processedDatasets.length === 0 ? (
          <p className="text-sm text-muted">
            Process a dataset first before training a model.
          </p>
        ) : (
          <form onSubmit={handleTrain} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Q4 Random Forest v1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dataset
                </label>
                <select
                  value={form.dataset_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dataset_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select a processed dataset</option>
                  {processedDatasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Algorithm
                </label>
                <select
                  value={form.algorithm}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, algorithm: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ALGORITHMS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date{' '}
                    <span className="text-slate-400">(opt)</span>
                  </label>
                  <input
                    type="date"
                    value={form.training_start_date ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        training_start_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date{' '}
                    <span className="text-slate-400">(opt)</span>
                  </label>
                  <input
                    type="date"
                    value={form.training_end_date ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        training_end_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={trainMut.isPending}
                className="btn btn-primary"
              >
                {trainMut.isPending ? (
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
                    Training...
                  </span>
                ) : (
                  'Train Model'
                )}
              </button>
              <p className="text-xs text-muted">
                Training runs synchronously and may take 10–60 seconds.
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Models list */}
      {isLoading ? (
        <div className="card">
          <p className="text-sm text-muted">Loading models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Brain}
            title="No models trained yet"
            description="Fill in the form above to train your first forecasting model."
          />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            Your Models ({models.length})
          </h2>
          {models.map((m) => {
            const expanded = expandedId === m.id
            const isActive = m.status === 'active'
            return (
              <div
                key={m.id}
                className={`card p-5 transition-all ${
                  isActive
                    ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/40 via-white to-white shadow-sm ring-1 ring-emerald-200'
                    : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Brain size={18} />
                      </div>
                      <span className="font-bold text-slate-800 text-base">
                        {m.name}
                      </span>
                      <StatusBadge status={m.status} />
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Star size={12} className="fill-emerald-500 text-emerald-500" />
                          Default Production Model
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Algorithm: <span className="text-slate-700 font-semibold">{ALGORITHMS.find((a) => a.value === m.algorithm)?.label ?? m.algorithm}</span>
                      {' · '}v{m.version}
                      {' · '}Trained on: {new Date(m.created_at).toLocaleDateString()}
                    </p>
                    {m.metrics && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <MetricChip label="MAE" value={m.metrics.mae} />
                        <MetricChip label="RMSE" value={m.metrics.rmse} />
                        <MetricChip label="MAPE%" value={m.metrics.mape} />
                        <MetricChip label="R²" value={m.metrics.r2} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(m.status === 'trained' || m.status === 'archived') && (
                      <button
                        onClick={() => activateMut.mutate(m.id)}
                        disabled={activateMut.isPending}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                      >
                        <Play size={12} />
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete model "${m.name}"?`)) {
                          deleteMut.mutate(m.id)
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      title="Delete model"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId(expanded ? null : m.id)
                      }
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                      title={expanded ? "Show less" : "Show details"}
                    >
                      {expanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase">
                        Dataset ID
                      </span>
                      <p className="text-slate-700 font-mono text-xs mt-0.5 truncate">
                        {m.dataset_id}
                      </p>
                    </div>
                    {m.training_start_date && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          Training Range
                        </span>
                        <p className="text-slate-700 mt-0.5">
                          {m.training_start_date} →{' '}
                          {m.training_end_date ?? 'latest'}
                        </p>
                      </div>
                    )}
                    {m.metrics && (
                      <>
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">
                            Validation Period
                          </span>
                          <p className="text-slate-700 mt-0.5">
                            Last 20% of training data
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase">
                            WAPE
                          </span>
                          <p className="text-slate-700 mt-0.5">
                            {m.metrics.wape != null
                              ? (m.metrics.wape * 100).toFixed(1) + '%'
                              : '—'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
