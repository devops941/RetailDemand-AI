import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryClient } from '../services/queryClient'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        try {
          queryClient.clear()
        } catch {
          /* ignore */
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },
      clearAuth: () => {
        try {
          queryClient.clear()
        } catch {
          /* ignore */
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
