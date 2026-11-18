import api from './api'

export interface ForecastPayload {
  product_id: string
  model_id: string
  start_date: string
  end_date: string
  unit_price: number
  discount_percentage: number
  promotion_type?: string
  holiday_indicator: boolean
  store_id?: string
  scenario_name?: string
}

export const forecastService = {
  predict: (data: ForecastPayload) => api.post('/forecasts/predict', data),
  list: () => api.get('/forecasts/'),
  get: (id: string) => api.get(`/forecasts/${id}`),
  delete: (scenarioId: string) => api.delete(`/forecasts/${scenarioId}`),
}
