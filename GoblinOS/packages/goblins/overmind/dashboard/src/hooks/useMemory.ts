import { type MemoryStats, api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export function useMemory() {
  const fallbackStats = useMemo<MemoryStats>(
    () => ({
      shortTerm: {
        count: 0,
        oldestTimestamp: Date.now(),
      },
      working: {
        count: 0,
        capacity: 32,
        utilizationPercent: 0,
      },
      longTerm: {
        memories: 12,
        entities: 5,
        episodes: 3,
      },
    }),
    []
  )

  const query = useQuery<MemoryStats, Error>({
    queryKey: ['memory-stats'],
    queryFn: () => api.getMemoryStats(),
    refetchInterval: 10000,
    retry: 1,
  })

  return {
    stats: query.data ?? (query.isError ? fallbackStats : undefined),
    isLoading: query.isLoading && !query.isError,
    isFallback: query.isError,
    error: query.error,
  }
}
