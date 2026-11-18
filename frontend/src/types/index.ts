export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'analyst' | 'manager'
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface Dataset {
  id: string
  name: string
  original_filename: string
  file_size: number
  file_type: string
  status: 'uploaded' | 'validating' | 'validated' | 'processing' | 'processed' | 'failed'
  row_count?: number
  column_names: string[]
  created_at: string
}

export interface ValidationResult {
  dataset_id: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows: number
  missing_value_counts: Record<string, number>
  data_quality_percentage: number
  warnings: string[]
  errors: string[]
}

export interface MLModel {
  id: string
  name: string
  algorithm: string
  dataset_id: string
  status: 'training' | 'trained' | 'active' | 'archived' | 'failed'
  version: number
  created_at: string
}

export interface ModelMetrics {
  mae: number
  rmse: number
  mape?: number
  wape?: number
  r2?: number
  validation_period_start?: string
  validation_period_end?: string
}

export interface ForecastRequest {
  product_id: string
  model_id: string
  start_date: string
  end_date: string
  unit_price: number
  discount_percentage: number
  promotion_type?: string
  holiday_indicator: boolean
  store_id?: string
}

export interface ForecastDayResult {
  date: string
  predicted_units: number
  expected_revenue?: number
}

export interface ForecastResult {
  scenario_id: string
  product_id: string
  model_id: string
  daily_predictions: ForecastDayResult[]
  total_predicted_units: number
  total_predicted_revenue?: number
  model_mae?: number
  model_rmse?: number
}

export interface APIResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  meta?: unknown
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface DashboardOverview {
  total_datasets: number
  total_models: number
  total_forecasts: number
  total_products: number
  total_sales_records: number
  total_units_sold: number
}
