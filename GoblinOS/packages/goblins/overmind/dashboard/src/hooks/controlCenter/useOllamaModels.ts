import { useQuery } from '@tanstack/react-query'
import { fetchOllamaModels } from '../../lib/controlCenter/api'
import type { OllamaModel } from '../../lib/controlCenter/types'

export function useOllamaModels() {
  return useQuery<OllamaModel[], Error>({
    queryKey: ['ollama-models'],
    queryFn: fetchOllamaModels,
    refetchInterval: 120_000,
  })
}
