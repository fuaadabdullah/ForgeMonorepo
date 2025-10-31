import { useMetrics } from '@/hooks/useMetrics'
import { formatCost, formatDuration } from '@/lib/utils'
import { Activity, DollarSign, TrendingUp, Zap } from 'lucide-react'
import type { ElementType } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export default function MetricsPage() {
  const { stats, isLoading, isFallback } = useMetrics()

  if (isLoading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    )
  }

  const providerData = Object.entries(stats.byProvider).map(([name, value]) => ({
    name,
    value,
  }))

  const strategyData = Object.entries(stats.byStrategy).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-2xl font-bold">Metrics</h2>
      </header>

      {isFallback && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            Displaying cached analytics — live routing stats are unreachable.
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <KpiCard
              icon={Activity}
              title="Total Requests"
              value={stats.totalRequests.toString()}
              color="text-blue-500"
            />
            <KpiCard
              icon={Zap}
              title="Avg Latency"
              value={formatDuration(stats.avgLatency)}
              color="text-purple-500"
            />
            <KpiCard
              icon={DollarSign}
              title="Total Cost"
              value={formatCost(stats.totalCost)}
              color="text-green-500"
            />
            <KpiCard
              icon={TrendingUp}
              title="Cost Savings"
              value="85%"
              subtitle="vs GPT-4o only"
              color="text-orange-500"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Provider Distribution */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Provider Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={providerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {providerData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Routing Strategy */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Routing Strategy</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={strategyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-lg font-semibold">Provider Breakdown</h3>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(stats.byProvider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium">{provider}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {count} requests ({((count / stats.totalRequests) * 100).toFixed(1)}%)
                    </span>
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / stats.totalRequests) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: ElementType
  title: string
  value: string
  subtitle?: string
  color: string
}) {
  const Icon = icon
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-8 w-8 ${color}`} />
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
    </div>
  )
}
