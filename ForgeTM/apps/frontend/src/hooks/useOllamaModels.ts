import { useQuery } from '@tanstack/react-query';
import { fetchOllamaModels } from '../lib/api';
import { OllamaModel } from '../lib/types';

export function useOllamaModels() {
  return useQuery<OllamaModel[], Error>({
    queryKey: ['ollama-models'],
    queryFn: fetchOllamaModels,
    refetchInterval: 120_000
  });
}
