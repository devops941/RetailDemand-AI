import api from './api'

export interface TrainRequest {
  dataset_id: string
  algorithm: string
  name: string
  product_ids?: string[]
  training_start_date?: string
  training_end_date?: string
}

export const modelService = {
  train: (data: TrainRequest) => api.post('/models/train', data),
  list: () => api.get('/models/'),
  get: (id: string) => api.get(`/models/${id}`),
  activate: (id: string) => api.post(`/models/${id}/activate`),
  delete: (id: string) => api.delete(`/models/${id}`),
}
