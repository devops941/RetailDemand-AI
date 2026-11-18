import api from './api'
import type { APIResponse, DashboardOverview } from '../types'

export const dashboardService = {
  getOverview: () => api.get<APIResponse<DashboardOverview>>('/dashboard/overview'),
  getSalesTrends: () => api.get<APIResponse>('/dashboard/sales-trends'),
  getTopProducts: () => api.get<APIResponse>('/dashboard/top-products'),
}
