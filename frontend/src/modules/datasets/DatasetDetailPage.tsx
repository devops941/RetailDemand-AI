import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetService } from '../../services/datasetService'
import PageHeader from '../../components/common/PageHeader'
import { CheckCircle, Cpu, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '../../store/toastStore'
import type { Dataset, ValidationResult } from '../../types'

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetService.get(id!).then((r) => r.data.data as Dataset),
    enabled: !!id,
    refetchInterval: (query) => {
      const st = query.state.data?.status
      return st === 'processing' || st === 'validating' ? 1000 : false
    },
  })

  const validateMut = useMutation({
    mutationFn: () => datasetService.validate(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dataset', id] })
      qc.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset validated!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Validation failed')
    },
  })

  const processMut = useMutation({
    mutationFn: () => datasetService.process(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dataset', id] })
      qc.invalidateQueries({ queryKey: ['datasets'] })
      qc.invalidateQueries({ queryKey: ['products-list'] })
      qc.invalidateQueries({ queryKey: ['historical-trends'] })
      qc.invalidateQueries({ queryKey: ['product-analytics'] })
      toast.success('Dataset processed successfully!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Processing failed')
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => datasetService.delete(id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset deleted')
      navigate('/datasets')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Delete failed')
    },
  })

  if (isLoading) return <div className="animate-pulse h-32 bg-slate-200 rounded-xl" />
  if (!dataset) return <p className="text-muted">Dataset not found</p>

  const valResult = validateMut.data?.data?.data as ValidationResult | undefined

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <button onClick={() => navigate('/datasets')} className="flex items-center gap-1 text-sm text-muted hover:text-slate-700">
          <ArrowLeft size={14} /> Back to datasets
        </button>
      </div>
      <PageHeader
        title={dataset.name}
        description={`${dataset.original_filename} · ${(dataset.file_size / 1024).toFixed(1)} KB`}
        action={
          <button className="btn-danger" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </button>
        }
      />

      <div className="card p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted">Status</span><p className="font-medium mt-0.5 capitalize">{dataset.status}</p></div>
          <div><span className="text-muted">Rows</span><p className="font-medium mt-0.5">{dataset.row_count != null ? dataset.row_count.toLocaleString() : '—'}</p></div>
          <div><span className="text-muted">Uploaded</span><p className="font-medium mt-0.5">{new Date(dataset.created_at).toLocaleString()}</p></div>
          <div><span className="text-muted">Columns</span><p className="font-medium mt-0.5">{dataset.column_names.length}</p></div>
        </div>
        {dataset.column_names.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Detected Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {dataset.column_names.map((c) => <span key={c} className="badge badge-gray">{c}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <button
          className="btn-outline"
          onClick={() => validateMut.mutate()}
          disabled={validateMut.isPending}
        >
          {validateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Validate Dataset
        </button>
        <button
          className="btn-primary"
          onClick={() => processMut.mutate()}
          disabled={processMut.isPending || dataset.status === 'processed'}
        >
          {processMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
          Process Dataset
        </button>
      </div>

      {valResult && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Validation Results</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted">Total Rows</span><p className="font-medium">{valResult.total_rows}</p></div>
            <div><span className="text-muted">Valid Rows</span><p className="font-medium text-green-700">{valResult.valid_rows}</p></div>
            <div><span className="text-muted">Invalid Rows</span><p className="font-medium text-red-600">{valResult.invalid_rows}</p></div>
            <div><span className="text-muted">Duplicates</span><p className="font-medium">{valResult.duplicate_rows}</p></div>
            <div><span className="text-muted">Data Quality</span><p className="font-medium">{valResult.data_quality_percentage}%</p></div>
          </div>
          {valResult.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {valResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
