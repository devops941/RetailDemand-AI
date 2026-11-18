import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Users, UserCheck, ShieldCheck, BarChart3 } from 'lucide-react'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import RequireRole from '../../components/common/RequireRole'
import { useToast } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'

type Role = 'admin' | 'analyst' | 'manager'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  analyst: 'bg-teal-100 text-teal-700',
}

const AVATAR_COLORS: Record<Role, string> = {
  admin: 'bg-purple-500',
  manager: 'bg-blue-500',
  analyst: 'bg-teal-500',
}

function Avatar({ user }: { user: User }) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${AVATAR_COLORS[user.role as Role] ?? 'bg-slate-400'}`}
    >
      {initials}
    </div>
  )
}

interface ModalProps {
  mode: 'create' | 'edit'
  user?: User
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  loading: boolean
}

function UserModal({ mode, user, onClose, onSubmit, loading }: ModalProps) {
  const [email, setEmail] = useState(user?.email ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [role, setRole] = useState<Role>((user?.role as Role) ?? 'analyst')
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'create') {
      onSubmit({ email, full_name: fullName, role, password })
    } else {
      onSubmit({ full_name: fullName, role, is_active: isActive })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {mode === 'create' ? 'Create New User' : `Edit ${user?.full_name}`}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="user@example.com"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="analyst">Analyst</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
          {mode === 'edit' && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">Account Status</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-slate-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
              <span className="text-xs text-muted">{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
              {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersContent() {
  const toast = useToast()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: User } | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () =>
      api.get<{ data: User[] }>('/users/').then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/users/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      setModal(null)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Failed to create user')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setModal(null)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Failed to update user')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Failed to delete user')
    },
  })

  const handleDelete = (u: User) => {
    if (!window.confirm(`Delete ${u.full_name}? This cannot be undone.`)) return
    deleteMut.mutate(u.id)
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-slate-500' },
    { label: 'Active', value: users.filter((u) => u.is_active).length, icon: UserCheck, color: 'text-green-500' },
    { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, icon: ShieldCheck, color: 'text-purple-500' },
    { label: 'Analysts', value: users.filter((u) => u.role === 'analyst').length, icon: BarChart3, color: 'text-teal-500' },
  ]

  const isMutating = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader title="User Management" description="Manage platform users, roles, and account access" />
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setModal({ mode: 'create' })}
        >
          <Plus size={15} />
          New User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <Icon size={18} className={color} />
            <div>
              <div className="text-lg font-bold text-slate-800">{value}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="analyst">Analyst</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map((h) => (
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
              {filtered.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={u} />
                        <div>
                          <div className="font-medium text-slate-800">
                            {u.full_name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted font-normal">(you)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_COLORS[u.role as Role] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.is_active ? 'badge badge-green' : 'badge badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit user"
                          onClick={() => setModal({ mode: 'edit', user: u })}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                          disabled={isSelf || deleteMut.isPending}
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          onClose={() => setModal(null)}
          loading={isMutating}
          onSubmit={(data) => {
            if (modal.mode === 'create') {
              createMut.mutate(data)
            } else if (modal.user) {
              updateMut.mutate({ id: modal.user.id, data })
            }
          }}
        />
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <RequireRole
      roles={['admin']}
      fallback={
        <div className="card p-8 text-center text-muted text-sm">
          Admin access required to manage users.
        </div>
      }
    >
      <UsersContent />
    </RequireRole>
  )
}
