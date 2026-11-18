import { useAuthStore } from '../../store/authStore'
import PageHeader from '../../components/common/PageHeader'

export default function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-lg">
      <PageHeader title="Profile" description="Your account information" />
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-sm">
          <div><span className="text-muted">Account Status</span><p className="font-medium mt-0.5">{user?.is_active ? 'Active' : 'Inactive'}</p></div>
          <div><span className="text-muted">Member Since</span><p className="font-medium mt-0.5">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p></div>
        </div>
      </div>
    </div>
  )
}
