import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import api from '../../services/api'
import { useToast } from '../../store/toastStore'
import { BarChart3, Loader2, Eye, EyeOff } from 'lucide-react'
import type { APIResponse, User } from '../../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { success, error: toastError } = useToast()

  const [email, setEmail] = useState('admin@retaildemand.ai')
  const [password, setPassword] = useState('Admin@123')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authService.login(email, password)
      const { access_token, refresh_token } = res.data
      const meRes = await api.get<APIResponse<User>>('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      setAuth(meRes.data.data, access_token, refresh_token)
      success(`Welcome back, ${meRes.data.data.full_name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
      const msg =
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.message ??
        (axiosErr?.response ? 'Invalid email or password' : 'Cannot connect to backend server. Please ensure the backend is running on http://localhost:8000.')
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center">
            <BarChart3 size={22} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">RetailDemand AI</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Predict demand.<br />Optimize promotions.<br />Grow revenue.
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-sm">
            AI-powered retail sales forecasting that understands the relationship between pricing,
            promotions, holidays, and seasonal patterns.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Forecast Accuracy', value: 'ML-Powered' },
            { label: 'Algorithms', value: '4 Models' },
            { label: 'Export Formats', value: 'PDF/CSV/XLSX' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4">
              <p className="text-white font-semibold text-sm">{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-primary-700 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900">RetailDemand AI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="text-sm text-muted mt-1">Enter your credentials to access the platform</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-primary-700 hover:underline">
                Forgot password?
              </Link>
              <Link to="/register" className="text-primary-700 hover:underline font-medium">
                Create account
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-muted mt-4">
            Demo — <span className="font-mono">admin@retaildemand.ai</span> / <span className="font-mono">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
