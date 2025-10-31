import { useQuery } from '@tanstack/react-query'
import { fetchRoutingAnalytics } from '../../lib/controlCenter/api'
import type { RoutingStats } from '../../lib/controlCenter/types'

export function useRoutingAnalytics() {
  return useQuery<RoutingStats, Error>({
    queryKey: ['routing-analytics'],
    queryFn: fetchRoutingAnalytics,
    refetchInterval: 60_000,
  })
}
