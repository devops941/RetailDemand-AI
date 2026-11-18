import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import RequireRole from '../../components/common/RequireRole'

interface AuditEntry {
  id: string
  user_email: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
  logout: 'bg-slate-100 text-slate-600',
  upload: 'bg-teal-100 text-teal-700',
  train: 'bg-orange-100 text-orange-700',
  activate: 'bg-indigo-100 text-indigo-700',
  export: 'bg-yellow-100 text-yellow-700',
}

function actionColor(action: string): string {
  const key = action.toLowerCase().split('_')[0]
  return ACTION_COLORS[key] ?? 'bg-slate-100 text-slate-600'
}

const PAGE_SIZE = 20

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () =>
      api.get<{ data: AuditEntry[] }>('/audit-logs/').then((r) => r.data.data),
  })

  const actionTypes = useMemo(() => {
    const unique = [...new Set(logs.map((l) => l.action.toLowerCase().split('_')[0]))]
    return unique.sort()
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        l.user_email.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.resource_type.toLowerCase().includes(search.toLowerCase())
      const matchesAction =
        actionFilter === 'all' || l.action.toLowerCase().startsWith(actionFilter)
      return matchesSearch && matchesAction
    })
  }, [logs, search, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const handleActionFilter = (v: string) => {
    setActionFilter(v)
    setPage(1)
  }

  return (
    <RequireRole
      roles={['admin']}
      fallback={
        <div className="card p-8 text-center text-muted text-sm">
          Admin access required to view audit logs.
        </div>
      }
    >
      <div className="space-y-5">
        <PageHeader
          title="Audit Logs"
          description="System activity and security events across the platform"
        />

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user, action, or resource..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => handleActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
          <span className="self-center text-xs text-muted">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted text-sm">Loading audit logs...</div>
          ) : paginated.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">No events found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['User', 'Action', 'Resource', 'Resource ID', 'Timestamp'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 text-xs">{l.user_email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(l.action)}`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs capitalize">
                      {l.resource_type}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs font-mono">
                      {l.resource_id ? l.resource_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  )
}
