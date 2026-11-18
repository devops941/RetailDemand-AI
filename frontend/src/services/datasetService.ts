import api from './api'
import type { APIResponse, Dataset, ValidationResult } from '../types'

export const datasetService = {
  upload: (file: File, name: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    return api.post<APIResponse<{ id: string; name: string; status: string }>>('/datasets/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () => api.get<APIResponse<Dataset[]>>('/datasets'),

  get: (id: string) => api.get<APIResponse<Dataset>>(`/datasets/${id}`),

  delete: (id: string) => api.delete<APIResponse>(`/datasets/${id}`),

  validate: (id: string) => api.post<APIResponse<ValidationResult>>(`/datasets/${id}/validate`),

  process: (id: string) => api.post<APIResponse<{ processed_rows: number; columns: string[] }>>(`/datasets/${id}/process`),
}
