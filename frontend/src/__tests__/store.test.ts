import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../store/authStore'
import type { User } from '../types'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'analyst',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('setAuth populates state correctly', () => {
    useAuthStore.getState().setAuth(mockUser, 'access_tok', 'refresh_tok')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('test@example.com')
    expect(state.accessToken).toBe('access_tok')
    expect(state.refreshToken).toBe('refresh_tok')
  })

  it('clearAuth resets all fields', () => {
    useAuthStore.getState().setAuth(mockUser, 'token', 'refresh')
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('updateUser replaces user without touching tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok', 'ref')
    const updated: User = { ...mockUser, full_name: 'Updated Name', role: 'admin' }
    useAuthStore.getState().updateUser(updated)
    const state = useAuthStore.getState()
    expect(state.user?.full_name).toBe('Updated Name')
    expect(state.user?.role).toBe('admin')
    expect(state.accessToken).toBe('tok')
  })
})
