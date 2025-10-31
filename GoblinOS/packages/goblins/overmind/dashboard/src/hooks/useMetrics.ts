import { type RoutingStats, api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export function useMetrics() {
  const fallbackStats = useMemo<RoutingStats>(
    () => ({
      totalRequests: 24,
      byProvider: { offline: 24 },
      byStrategy: { 'offline-cache': 24 },
      avgLatency: 180,
      totalCost: 0,
    }),
    []
  )

  const query = useQuery<RoutingStats, Error>({
    queryKey: ['routing-stats'],
    queryFn: () => api.getRoutingStats(),
    refetchInterval: 5000,
    retry: 1,
  })

  return {
    stats: query.data ?? (query.isError ? fallbackStats : undefined),
    isLoading: query.isLoading && !query.isError,
    isFallback: query.isError,
    error: query.error,
  }
}
