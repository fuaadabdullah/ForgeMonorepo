import { useQuery } from '@tanstack/react-query';

interface RoutingDecision {
  timestamp: string;
  taskType: string;
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  latency?: number;
  cost?: number;
  fallbackUsed?: boolean;
}

interface RoutingStats {
  totalRequests: number;
  providerUsage: Record<string, number>;
  averageLatency: Record<string, number>;
  costSavings: number;
  fallbackRate: number;
  recentDecisions: RoutingDecision[];
}

async function fetchRoutingAnalytics(): Promise<RoutingStats> {
  const response = await fetch('/v1/analytics');
  if (!response.ok) {
    throw new Error('Failed to fetch routing analytics');
  }
  return response.json();
}

export function useRoutingAnalytics() {
  return useQuery({
    queryKey: ['routing-analytics'],
    queryFn: fetchRoutingAnalytics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
