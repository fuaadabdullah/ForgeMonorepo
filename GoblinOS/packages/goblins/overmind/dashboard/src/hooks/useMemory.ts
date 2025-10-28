import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export function useMemory() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['memory-stats'],
    queryFn: () => api.getMemoryStats(),
    refetchInterval: 10000,
  })

  return {
    stats,
    isLoading,
  }
}
