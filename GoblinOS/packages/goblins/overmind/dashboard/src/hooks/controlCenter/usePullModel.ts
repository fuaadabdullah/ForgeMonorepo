import { type UseMutateFunction, useMutation } from '@tanstack/react-query'
import { pullOllamaModel } from '../../lib/controlCenter/api'
import type { PullModelRequest, PullModelResponse } from '../../lib/controlCenter/types'

export function usePullModel(
  onSuccess?: () => void
): UseMutateFunction<PullModelResponse, Error, PullModelRequest, unknown> {
  const mutation = useMutation<PullModelResponse, Error, PullModelRequest>({
    mutationFn: pullOllamaModel,
    onSuccess: () => {
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  return mutation.mutateAsync
}
