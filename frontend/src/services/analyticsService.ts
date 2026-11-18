import api from './api'
import type { APIResponse } from '../types'

export const analyticsService = {
  getHistorical: (params: {
    dataset_id: string
    start_date?: string
    end_date?: string
    product_id?: string
    granularity?: string
  }) => api.get<APIResponse>('/analytics/historical', { params }),

  getProducts: (dataset_id: string) =>
    api.get<APIResponse>('/analytics/products', { params: { dataset_id } }),

  getCategories: (dataset_id: string) =>
    api.get<APIResponse>('/analytics/categories', { params: { dataset_id } }),

  getPromotions: (dataset_id: string) =>
    api.get<APIResponse>('/analytics/promotions', { params: { dataset_id } }),

  getProductsList: (dataset_id: string) =>
    api.get<APIResponse>('/analytics/products-list', { params: { dataset_id } }),
}
