import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password)
    const { access_token, refresh_token } = res.data
    const meRes = await authService.getMe()
    setAuth(meRes.data.data, access_token, refresh_token)
    navigate('/dashboard')
  }

  const logout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      try { await authService.logout(refreshToken) } catch { /* ignore */ }
    }
    clearAuth()
    navigate('/login')
  }

  return { user, isAuthenticated, login, logout }
}
