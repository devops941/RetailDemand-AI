import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import MainLayout from '../layouts/MainLayout'

// Auth pages
import LoginPage from '../modules/auth/LoginPage'
import RegisterPage from '../modules/auth/RegisterPage'
import ForgotPasswordPage from '../modules/auth/ForgotPasswordPage'

// App pages
import DashboardPage from '../modules/dashboard/DashboardPage'
import DatasetsPage from '../modules/datasets/DatasetsPage'
import DatasetUploadPage from '../modules/datasets/DatasetUploadPage'
import DatasetDetailPage from '../modules/datasets/DatasetDetailPage'
import TrendExplorerPage from '../modules/trends/TrendExplorerPage'
import ModelsPage from '../modules/models/ModelsPage'
import ForecastingPage from '../modules/forecasting/ForecastingPage'
import ForecastComparisonPage from '../modules/forecasting/ForecastComparisonPage'
import PromotionAnalysisPage from '../modules/promotions/PromotionAnalysisPage'
import ReportsPage from '../modules/reports/ReportsPage'
import ProfilePage from '../modules/settings/ProfilePage'


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="datasets/upload" element={<DatasetUploadPage />} />
        <Route path="datasets/:id" element={<DatasetDetailPage />} />
        <Route path="trends" element={<TrendExplorerPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="forecasting" element={<ForecastingPage />} />
        <Route path="forecast-comparison" element={<ForecastComparisonPage />} />
        <Route path="promotions" element={<PromotionAnalysisPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />

      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
