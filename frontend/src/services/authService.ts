import api from './api'
import type { APIResponse, AuthTokens, User } from '../types'

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  register: (email: string, full_name: string, password: string, role: string) =>
    api.post<APIResponse<{ id: string; email: string }>>('/auth/register', { email, full_name, password, role }),

  logout: (refresh_token: string) =>
    api.post<APIResponse>('/auth/logout', { refresh_token }),

  getMe: () =>
    api.get<APIResponse<User>>('/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    api.post<APIResponse>('/auth/change-password', { current_password, new_password }),

  forgotPassword: (email: string) =>
    api.post<APIResponse>('/auth/forgot-password', { email }),
}
