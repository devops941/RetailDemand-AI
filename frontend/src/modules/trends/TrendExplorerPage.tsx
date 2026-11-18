import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { analyticsService } from '../../services/analyticsService'
import { datasetService } from '../../services/datasetService'
import ChartCard from '../../components/charts/ChartCard'
import SalesLineChart from '../../components/charts/SalesLineChart'
import ProductBarChart from '../../components/charts/ProductBarChart'
import CategoryPieChart from '../../components/charts/CategoryPieChart'
import PromotionBarChart from '../../components/charts/PromotionBarChart'
import PageHeader from '../../components/common/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { TrendingUp, Database } from 'lucide-react'
import type { Dataset } from '../../types'

interface TrendSummary {
  total_units: number
  avg_daily_units: number
  total_revenue?: number
  date_range_start: string
  date_range_end: string
  total_days: number
}

export default function TrendExplorerPage() {
  const user = useAuthStore((s) => s.user)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('monthly')
  const [showRevenue, setShowRevenue] = useState(false)

  // Load processed datasets
  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets', user?.id],
    queryFn: () => datasetService.list().then((r) => r.data.data as Dataset[]),
  })

  const processedDatasets = datasets.filter((d) => d.status === 'processed')
  const activeId = selectedDatasetId || processedDatasets[0]?.id || ''

  // Product list for filter
  const { data: productsList = [] } = useQuery({
    queryKey: ['products-list', activeId],
    queryFn: () =>
      analyticsService
        .getProductsList(activeId)
        .then((r) => r.data.data as Array<{ product_id: string; product_name?: string }>),
    enabled: !!activeId,
  })

  // Historical trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['historical-trends', activeId, selectedProduct, granularity],
    queryFn: () =>
      analyticsService
        .getHistorical({
          dataset_id: activeId,
          product_id: selectedProduct || undefined,
          granularity,
        })
        .then(
          (r) =>
            r.data.data as {
              daily: Array<{ date: string; units: number; revenue?: number }>
              monthly: Array<{ month: string; units: number; revenue?: number }>
              summary: TrendSummary
            },
        ),
    enabled: !!activeId,
  })

  // Product analytics
  const { data: productData = [], isLoading: productLoading } = useQuery({
    queryKey: ['product-analytics', activeId],
    queryFn: () => analyticsService.getProducts(activeId).then((r) => r.data.data),
    enabled: !!activeId,
  })

  // Category analytics
  const { data: categoryData = [], isLoading: categoryLoading } = useQuery({
    queryKey: ['category-analytics', activeId],
    queryFn: () => analyticsService.getCategories(activeId).then((r) => r.data.data),
    enabled: !!activeId,
  })

  // Promotion analytics
  const { data: promoData, isLoading: promoLoading } = useQuery({
    queryKey: ['promotion-analytics', activeId],
    queryFn: () => analyticsService.getPromotions(activeId).then((r) => r.data.data),
    enabled: !!activeId,
  })

  const summary: TrendSummary | undefined = trendsData?.summary
  const chartData =
    granularity === 'daily'
      ? (trendsData?.daily ?? [])
      : (trendsData?.monthly ?? [])

  if (processedDatasets.length === 0) {
    return (
      <div>
        <PageHeader title="Trend Explorer" description="Explore historical sales trends and patterns" />
        <div className="card">
          <EmptyState
            icon={TrendingUp}
            title="No processed datasets"
            description="Upload a sales dataset and run processing to explore trends."
            action={
              <a href="/datasets/upload" className="btn-primary flex items-center gap-2">
                <Database size={16} />
                Upload Dataset
              </a>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Trend Explorer"
        description="Explore historical sales trends, product performance, and promotion impact"
      />

      {/* Filters bar */}
      <div className="card p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center bg-white border border-slate-200">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Dataset</label>
          <select
            className="input py-2 text-sm min-w-[220px] font-medium"
            value={activeId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value)
              setSelectedProduct('')
            }}
          >
            {processedDatasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Product</label>
          <select
            className="input py-2 text-sm min-w-[180px] font-medium"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">All Products</option>
            {productsList.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name ?? p.product_id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Granularity</label>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 overflow-hidden">
            {(['daily', 'monthly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  granularity === g
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {trendsData?.daily?.some((d) => 'revenue' in d) && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer ml-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={showRevenue}
              onChange={(e) => setShowRevenue(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            Show Revenue
          </label>
        )}
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Units Sold', value: summary.total_units.toLocaleString(), sub: 'Historical volume' },
            { label: 'Avg Daily Units', value: summary.avg_daily_units.toFixed(1), sub: 'Per day average' },
            { label: 'Date Range Start', value: summary.date_range_start, sub: 'Initial record' },
            { label: 'Date Range End', value: summary.date_range_end, sub: 'Latest record' },
            {
              label: summary.total_revenue ? 'Total Revenue' : 'Days of Data',
              value: summary.total_revenue
                ? `$${summary.total_revenue.toLocaleString()}`
                : String(summary.total_days),
              sub: summary.total_revenue ? 'Gross sales' : 'Coverage period',
            },
          ].map((s) => (
            <div key={s.label} className="card p-4 hover:shadow-md transition-shadow border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1 truncate">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="space-y-4">
        <ChartCard
          title={granularity === 'daily' ? 'Daily Sales Trend' : 'Monthly Sales Trend'}
          description="Units sold over time"
          loading={trendsLoading}
          height={280}
        >
          <SalesLineChart
            data={chartData as Array<{ date?: string; month?: string; units: number; revenue?: number }>}
            xKey={granularity === 'daily' ? 'date' : 'month'}
            showRevenue={showRevenue}
          />
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top Products by Units Sold" loading={productLoading} height={280}>
            <ProductBarChart
              data={
                productData as Array<{
                  product_id: string
                  product_name?: string
                  total_units: number
                  revenue?: number
                }>
              }
            />
          </ChartCard>

          <ChartCard title="Sales by Category" loading={categoryLoading} height={280}>
            <CategoryPieChart
              data={
                categoryData as Array<{
                  category: string
                  total_units: number
                  share_pct?: number
                }>
              }
            />
          </ChartCard>
        </div>

        {Boolean(
          promoData &&
            typeof promoData === 'object' &&
            !('message' in (promoData as object)),
        ) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Boolean((promoData as any)?.by_promotion_type) && (
              <ChartCard title="Sales by Promotion Type" loading={promoLoading} height={260}>
                <PromotionBarChart
                  data={
                    (promoData as any).by_promotion_type as Array<{
                      promotion_type?: string
                      discount_tier?: string
                      total_units: number
                      avg_units?: number
                    }>
                  }
                  xKey="promotion_type"
                />
              </ChartCard>
            )}
            {Boolean((promoData as any)?.by_discount_tier) && (
              <ChartCard title="Sales by Discount Tier" loading={promoLoading} height={260}>
                <PromotionBarChart
                  data={
                    (promoData as any).by_discount_tier as Array<{
                      promotion_type?: string
                      discount_tier?: string
                      total_units: number
                      avg_units?: number
                    }>
                  }
                  xKey="discount_tier"
                />
              </ChartCard>
            )}
          </div>
        )}

        {/* Category breakdown table */}
        {Array.isArray(categoryData) && categoryData.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Category Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Category', 'Total Units', 'Share %', 'Products', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(
                  categoryData as Array<{
                    category: string
                    total_units: number
                    share_pct?: number
                    unique_products?: number
                    revenue?: number
                  }>
                ).map((c) => (
                  <tr key={c.category} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{c.category}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.total_units.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5 max-w-20">
                          <div
                            className="bg-primary-700 h-1.5 rounded-full"
                            style={{ width: `${c.share_pct ?? 0}%` }}
                          />
                        </div>
                        <span className="text-slate-600 text-xs">{c.share_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.unique_products ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {c.revenue ? `$${Number(c.revenue).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
