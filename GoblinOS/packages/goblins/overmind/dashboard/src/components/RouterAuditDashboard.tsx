import {
  type RouterAuditLog,
  fetchGuildKPIMetrics,
  fetchRouterAuditLogs,
} from '@/lib/controlCenter/api'
import { useQuery } from '@tanstack/react-query'

interface RouterAuditDashboardProps {
  className?: string
}

export function RouterAuditDashboard({ className }: RouterAuditDashboardProps) {
  const auditLogsQuery = useQuery({
    queryKey: ['router-audit-logs'],
    queryFn: () => fetchRouterAuditLogs({ limit: 50 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const guilds: RouterAuditLog['guild'][] = ['forge', 'crafters', 'keepers', 'huntress', 'mages']

  const kpiMetricsQueries = useQuery({
    queryKey: ['guild-kpi-metrics-all'],
    queryFn: async () => {
      const results = await Promise.all(
        guilds.map((guild) => fetchGuildKPIMetrics(guild).catch(() => null))
      )
      return guilds.reduce(
        (acc, guild, index) => {
          acc[guild] = results[index]
          return acc
        },
        {} as Record<
          string,
          {
            current: Record<string, number>
            targets: Record<string, number>
            trends: Array<{ timestamp: string; metrics: Record<string, number> }>
          } | null
        >
      )
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getGuildColor = (guild: RouterAuditLog['guild']) => {
    const colors = {
      forge: 'bg-orange-100 text-orange-800',
      crafters: 'bg-purple-100 text-purple-800',
      keepers: 'bg-blue-100 text-blue-800',
      huntress: 'bg-green-100 text-green-800',
      mages: 'bg-indigo-100 text-indigo-800',
    }
    return colors[guild] || 'bg-gray-100 text-gray-800'
  }

  const getSuccessColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Router Audit Dashboard</h2>

        {/* Guild KPI Metrics */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Guild KPI Metrics</h3>
          {kpiMetricsQueries.isLoading ? (
            <div className="text-gray-500">Loading metrics...</div>
          ) : kpiMetricsQueries.error ? (
            <div className="text-red-500">
              Error loading metrics: {kpiMetricsQueries.error.message}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(kpiMetricsQueries.data || {}).map(([guild, metricsData]) => {
                if (!metricsData) return null
                const metrics = metricsData.current
                return (
                  <div key={guild} className="bg-gray-50 rounded-lg p-4">
                    <h4
                      className={`text-sm font-medium mb-2 capitalize ${getGuildColor(guild as RouterAuditLog['guild'])}`}
                    >
                      {guild} Guild
                    </h4>
                    <div className="space-y-1 text-sm">
                      {metrics.buildTime !== undefined && (
                        <div>Build Time: {metrics.buildTime}ms</div>
                      )}
                      {metrics.cls !== undefined && <div>CLS: {metrics.cls.toFixed(3)}</div>}
                      {metrics.securityScore !== undefined && (
                        <div>Security: {metrics.securityScore}/100</div>
                      )}
                      {metrics.testCoverage !== undefined && (
                        <div>Coverage: {metrics.testCoverage}%</div>
                      )}
                      {metrics.qualityScore !== undefined && (
                        <div>Quality: {metrics.qualityScore}/100</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Router Audit Logs */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Router Decisions</h3>
          {auditLogsQuery.isLoading ? (
            <div className="text-gray-500">Loading audit logs...</div>
          ) : auditLogsQuery.error ? (
            <div className="text-red-500">Error loading logs: {auditLogsQuery.error.message}</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogsQuery.data?.map((log, index) => (
                <div key={`${log.sessionId}-${index}`} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getGuildColor(log.guild)}`}
                      >
                        {log.guild}
                      </span>
                      <span className="text-sm font-medium">{log.task}</span>
                      <span className={`text-sm ${getSuccessColor(log.success)}`}>
                        {log.success ? '✓' : '✗'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>LiteBrain:</strong> {log.liteBrain}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Reason:</strong> {log.routingReason}
                  </div>
                  {log.escalationTrigger && (
                    <div className="text-sm text-orange-600 mb-1">
                      <strong>Escalation:</strong> {log.escalationTrigger}
                    </div>
                  )}
                  {log.kpi && (
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>KPI:</strong> {JSON.stringify(log.kpi)}
                    </div>
                  )}
                  {log.error && (
                    <div className="text-sm text-red-600">
                      <strong>Error:</strong> {log.error}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    <strong>Fallback Chain:</strong> {log.fallbackChain.join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
