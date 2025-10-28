import { api } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useChat() {
  const queryClient = useQueryClient()

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['chat-history'],
    queryFn: () => api.getHistory(),
    refetchInterval: 5000,
  })

  const sendMessage = useMutation({
    mutationFn: (message: string) => api.chat(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] })
      queryClient.invalidateQueries({ queryKey: ['routing-stats'] })
    },
  })

  const clearHistory = useMutation({
    mutationFn: () => api.clearHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] })
    },
  })

  return {
    history,
    isLoading,
    sendMessage,
    clearHistory,
  }
}
