import { type ChatMessage, type ChatResponse, api } from '@/lib/api'
import { routerAuditLogger } from '@/lib/controlCenter/router-audit'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useState } from 'react'

const OFFLINE_HISTORY: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      'Overmind is currently offline. Feel free to jot down ideas—once the backend returns, the guild will pick things back up.',
    timestamp: Date.now(),
  },
]

export function useChat() {
  const queryClient = useQueryClient()
  const [localHistory, setLocalHistory] = useState<ChatMessage[]>(OFFLINE_HISTORY)

  const historyQuery = useQuery<ChatMessage[], Error>({
    queryKey: ['chat-history'],
    queryFn: () => api.getHistory(),
    refetchInterval: 5000,
    retry: 1,
  })

  // Handle success in useEffect
  React.useEffect(() => {
    if (historyQuery.data) {
      setLocalHistory(historyQuery.data.length > 0 ? historyQuery.data : OFFLINE_HISTORY)
    }
  }, [historyQuery.data])

  const isOffline = historyQuery.isError
  const history: ChatMessage[] = historyQuery.data ?? localHistory

  const sendMessage = useMutation<ChatResponse, Error, string>({
    mutationFn: async (message: string) => {
      if (isOffline) {
        const now = Date.now()
        const userEntry: ChatMessage = { role: 'user', content: message, timestamp: now }
        const assistantEntry: ChatMessage = {
          role: 'assistant',
          content:
            '📡 Offline mode reply: your note is cached locally. Once connectivity returns, I will sync it with the guild.',
          timestamp: now + 1,
        }

        const baseline = historyQuery.data ?? localHistory
        const updatedHistory = [
          ...(Array.isArray(baseline) ? baseline : []),
          userEntry,
          assistantEntry,
        ]
        setLocalHistory(updatedHistory)
        queryClient.setQueryData(['chat-history'], updatedHistory)

        return {
          response: assistantEntry.content,
          provider: 'offline',
          model: 'local-dev',
          routing: {
            strategy: 'offline-fallback',
            reason: 'Backend unavailable; stored locally',
          },
          metrics: {
            latency: 25,
            tokens: userEntry.content.length + assistantEntry.content.length,
            cost: 0,
          },
        }
      }

      const reply = await api.chat(message)
      return reply
    },
    onSuccess: (data) => {
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ['chat-history'] })
        queryClient.invalidateQueries({ queryKey: ['routing-stats'] })

        // Log router audit for successful routing decisions
        if (data?.routing) {
          routerAuditLogger
            .logMagesDecision(
              'chat-routing',
              data.routing.strategy || 'unknown',
              undefined, // qualityScore - could be derived from response quality
              true, // success
              undefined // error
            )
            .catch((error) => {
              console.error('Failed to log router audit:', error)
            })
        }
      }
    },
  })

  const clearHistory = useMutation<void, Error>({
    mutationFn: async () => {
      if (isOffline) {
        setLocalHistory(OFFLINE_HISTORY)
        return
      }
      await api.clearHistory()
    },
    onSuccess: () => {
      if (isOffline) {
        setLocalHistory(OFFLINE_HISTORY)
        queryClient.setQueryData(['chat-history'], OFFLINE_HISTORY)
      } else {
        queryClient.invalidateQueries({ queryKey: ['chat-history'] })
      }
    },
  })

  return {
    history,
    isLoading: historyQuery.isLoading && !historyQuery.isError,
    isOffline,
    error: historyQuery.error,
    sendMessage,
    clearHistory,
  }
}
