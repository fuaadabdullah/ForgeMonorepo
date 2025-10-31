import { useQuery } from '@tanstack/react-query'
import { fetchProvidersHealth } from '../../lib/controlCenter/api'
import type { ProvidersHealthResponse } from '../../lib/controlCenter/types'

export function useProviderHealth() {
  return useQuery<ProvidersHealthResponse, Error>({
    queryKey: ['providers-health'],
    queryFn: fetchProvidersHealth,
    refetchInterval: 60_000,
  })
}
