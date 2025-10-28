import { useChat } from '@/hooks/useChat'
import { formatCost, formatDuration } from '@/lib/utils'
import { Loader2, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { history, sendMessage, clearHistory } = useChat()

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return
    sendMessage.mutate(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-2xl font-bold">Chat</h2>
        <button
          onClick={() => clearHistory.mutate()}
          disabled={clearHistory.isPending}
          className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Clear History
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {msg.role === 'user' ? 'You' : 'Overmind'}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.timestamp && (
                  <div className="mt-2 text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-muted px-4 py-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Metrics Banner */}
      {sendMessage.data && (
        <div className="border-t border-border bg-card px-6 py-2">
          <div className="mx-auto max-w-4xl flex items-center gap-6 text-xs text-muted-foreground">
            <span>
              Provider: <strong>{sendMessage.data.provider}</strong>
            </span>
            <span>
              Model: <strong>{sendMessage.data.model}</strong>
            </span>
            <span>
              Latency: <strong>{formatDuration(sendMessage.data.metrics.latency)}</strong>
            </span>
            <span>
              Cost: <strong>{formatCost(sendMessage.data.metrics.cost)}</strong>
            </span>
            <span>
              Strategy: <strong>{sendMessage.data.routing.strategy}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card p-6">
        <div className="mx-auto max-w-4xl flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
