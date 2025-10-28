import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export function useMetrics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['routing-stats'],
    queryFn: () => api.getRoutingStats(),
    refetchInterval: 5000,
  })

  return {
    stats,
    isLoading,
  }
}
