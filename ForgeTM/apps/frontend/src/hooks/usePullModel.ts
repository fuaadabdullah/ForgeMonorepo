import { useMutation, UseMutateFunction } from '@tanstack/react-query';
import { pullOllamaModel } from '../lib/api';
import { PullModelRequest, PullModelResponse } from '../lib/types';

export function usePullModel(onSuccess?: () => void): UseMutateFunction<PullModelResponse, Error, PullModelRequest, unknown> {
  const mutation = useMutation<PullModelResponse, Error, PullModelRequest>({
    mutationFn: pullOllamaModel,
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    }
  });

  return mutation.mutateAsync;
}
