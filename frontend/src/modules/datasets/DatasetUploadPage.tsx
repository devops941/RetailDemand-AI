import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { datasetService } from '../../services/datasetService'
import PageHeader from '../../components/common/PageHeader'
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '../../store/toastStore'

export default function DatasetUploadPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setName(f.name.replace(/\.[^.]+$/, '')) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setName(f.name.replace(/\.[^.]+$/, '')) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const res = await datasetService.upload(file, name)
      await qc.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset uploaded successfully!')
      const datasetId = res.data?.data?.id
      if (datasetId) {
        navigate(`/datasets/${datasetId}`)
      } else {
        navigate('/datasets')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Upload Dataset" description="Upload a CSV or XLSX file containing your sales data" />
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-700 hover:bg-teal-50/40 transition-colors"
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFile} className="hidden" />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle size={36} className="text-green-500" />
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-muted">{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={36} className="text-slate-400" />
                <p className="font-medium text-slate-700">Drop file here or click to browse</p>
                <p className="text-sm text-muted">Supports CSV and XLSX files up to 50 MB</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Dataset Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Q1 2024 Sales Data" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={!file || !name || loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload Dataset</>}
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate('/datasets')}>Cancel</button>
          </div>
        </form>
      </div>

      <div className="card p-5 mt-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Required Columns</h3>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
          {['date', 'product_id', 'product_name', 'category', 'quantity_sold', 'unit_price (opt)', 'discount_percentage (opt)', 'promotion_type (opt)', 'holiday_indicator (opt)'].map((c) => (
            <div key={c} className="flex items-center gap-1.5"><FileText size={12} className="text-muted" />{c}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
