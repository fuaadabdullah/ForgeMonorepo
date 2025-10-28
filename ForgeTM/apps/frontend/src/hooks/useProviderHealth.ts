import { useQuery } from '@tanstack/react-query';
import { fetchProvidersHealth } from '../lib/api';
import { ProvidersHealthResponse } from '../lib/types';

export function useProviderHealth() {
  return useQuery<ProvidersHealthResponse, Error>({
    queryKey: ['providers-health'],
    queryFn: fetchProvidersHealth,
    refetchInterval: 60_000
  });
}
