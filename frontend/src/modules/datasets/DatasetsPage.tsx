import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { datasetService } from '../../services/datasetService'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { Database, Upload, Eye, RefreshCw } from 'lucide-react'
import type { Dataset } from '../../types'
import { clsx } from 'clsx'

const statusBadge: Record<string, string> = {
  uploaded: 'badge-yellow',
  validating: 'badge-blue',
  validated: 'badge-blue',
  processing: 'badge-blue',
  processed: 'badge-green',
  failed: 'badge-red',
}

export default function DatasetsPage() {
  const user = useAuthStore((s) => s.user)
  const {
    data: datasets = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['datasets', user?.id],
    queryFn: () => datasetService.list().then((r) => r.data.data as Dataset[]),
    refetchOnMount: 'always',
    staleTime: 0,
    refetchInterval: (query) => {
      const items = query.state.data ?? []
      const isBusy = items.some(
        (d) => d.status === 'processing' || d.status === 'validating',
      )
      return isBusy ? 1500 : false
    },
  })

  return (
    <div>
      <PageHeader
        title="Datasets"
        description="Manage your uploaded sales datasets"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="btn-outline py-2 px-3 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
              title="Refresh dataset list"
              disabled={isFetching}
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin text-primary-600' : ''} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link to="/datasets/upload" className="btn-primary">
              <Upload size={16} /> Upload Dataset
            </Link>
          </div>
        }
      />
      {isLoading ? (
        <div className="card p-6 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-200 rounded" />)}
        </div>
      ) : datasets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Database}
            title="No datasets yet"
            description="Upload a CSV or XLSX file to get started"
            action={<Link to="/datasets/upload" className="btn-primary"><Upload size={16} /> Upload Dataset</Link>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'File', 'Size', 'Rows', 'Status', 'Uploaded', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datasets.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-muted">{d.original_filename}</td>
                  <td className="px-4 py-3 text-muted">{(d.file_size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-muted">{d.row_count != null ? d.row_count.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', statusBadge[d.status] ?? 'badge-gray')}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/datasets/${d.id}`} className="btn-outline py-1 px-2 text-xs"><Eye size={12} /> View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
