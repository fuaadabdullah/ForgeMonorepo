import {
  Clock,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
/* eslint-disable */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/utils'

interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  id: string
}

interface VirtualizedLogViewerProps {
  logs: LogEntry[]
  itemHeight?: number
  containerHeight?: number
  enableLiveStreaming?: boolean
  onStreamToggle?: (enabled: boolean) => void
  isStreaming?: boolean
  onCopyFiltered?: (filteredLogs: LogEntry[]) => void
  className?: string
}

export default function VirtualizedLogViewer({
  logs,
  itemHeight = 24,
  containerHeight = 400,
  enableLiveStreaming = true,
  onStreamToggle,
  isStreaming = false,
  onCopyFiltered,
  className,
}: VirtualizedLogViewerProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all')
  const [timeRange, setTimeRange] = useState<[number, number]>([0, Date.now()])
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Calculate visible range for virtualization

  const visibleRange = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(startIndex + visibleRange + 5, logs.length)

  // Filter logs based on search, level, and time range
  const filteredLogs = useMemo(() => {
    return logs.filter((log, _index) => {
      // Level filter
      if (filterLevel !== 'all' && log.level !== filterLevel) return false

      // Time range filter
      if (log.timestamp < timeRange[0] || log.timestamp > timeRange[1]) return false

      // Search filter
      if (searchTerm) {
        return log.message.toLowerCase().includes(searchTerm.toLowerCase())
      }

      return true
    })
  }, [logs, searchTerm, filterLevel, timeRange])

  const visibleLogs = filteredLogs.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  // Auto-scroll to bottom when new logs arrive and autoScroll is enabled
  useEffect(() => {
    if (autoScroll && containerRef.current && filteredLogs.length > 0) {
      const isAtBottom =
        containerRef.current.scrollTop + containerRef.current.clientHeight >=
        containerRef.current.scrollHeight - 50
      if (isAtBottom) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }
  }, [filteredLogs.length, autoScroll])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F to focus search
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }

      // L to toggle tail mode (auto-scroll)
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        setAutoScroll((prev) => !prev)
      }

      // ] to jump to next marker (error/warn)
      if (e.key === ']') {
        e.preventDefault()
        const currentIndex = selectedLogIndex ?? startIndex
        const nextMarkerIndex = filteredLogs.findIndex(
          (log, index) => index > currentIndex && (log.level === 'error' || log.level === 'warn')
        )
        if (nextMarkerIndex !== -1) {
          setSelectedLogIndex(nextMarkerIndex)
          const scrollTo = nextMarkerIndex * itemHeight
          containerRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' })
        }
      }

      // [ to jump to previous marker
      if (e.key === '[') {
        e.preventDefault()
        const currentIndex = selectedLogIndex ?? startIndex
        const prevMarkerIndex = (() => {
          for (let i = currentIndex - 1; i >= 0; i--) {
            if (filteredLogs[i].level === 'error' || filteredLogs[i].level === 'warn') {
              return i
            }
          }
          return -1
        })()
        if (prevMarkerIndex !== -1) {
          setSelectedLogIndex(prevMarkerIndex)
          const scrollTo = prevMarkerIndex * itemHeight
          containerRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' })
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedLogIndex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLogIndex, startIndex, filteredLogs])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop
      setScrollTop(newScrollTop)

      // Disable auto-scroll if user manually scrolls up
      const isAtBottom =
        newScrollTop + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 50
      if (!isAtBottom && autoScroll) {
        setAutoScroll(false)
      }
    },
    [autoScroll]
  )

  const handleCopyFiltered = useCallback(() => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
      )
      .join('\n')

    navigator.clipboard.writeText(logText).then(() => {
      // Could show a toast notification here
      console.log('Filtered logs copied to clipboard')
    })

    onCopyFiltered?.(filteredLogs)
  }, [filteredLogs, onCopyFiltered])

  const handleTimeScrub = useCallback((startTime: number, endTime: number) => {
    setTimeRange([startTime, endTime])
  }, [])

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-600 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      case 'debug':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-900'
    }
  }

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text

    const regex = new RegExp(`(${term})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (logs.length === 0) {
    return (
      <div className={cn('rounded-md border border-border p-4', className)}>
        <div className="text-muted-foreground text-sm text-center">
          No logs yet
          {enableLiveStreaming && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => onStreamToggle?.(!isStreaming)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent"
              >
                {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isStreaming ? 'Pause' : 'Start'} Stream
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col rounded-md border border-border', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 rounded hover:bg-accent"
            title="Toggle search (F)"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="text-xs px-2 py-1 rounded border border-border bg-background"
            title="Filter logs by level"
            aria-label="Filter logs by level"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn('p-1 rounded hover:bg-accent', autoScroll && 'bg-accent')}
            title={`Toggle auto-scroll (L) - ${autoScroll ? 'On' : 'Off'}`}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Streaming Toggle */}
          {enableLiveStreaming && (
            <button
              onClick={() => onStreamToggle?.(!isStreaming)}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent',
                isStreaming && 'bg-green-100 text-green-700 border-green-300'
              )}
              title={isStreaming ? 'Pause live streaming' : 'Start live streaming'}
            >
              {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isStreaming ? 'Live' : 'Paused'}
            </button>
          )}

          {/* Copy Filtered Logs */}
          <button
            onClick={handleCopyFiltered}
            className="p-1 rounded hover:bg-accent"
            title="Copy filtered logs"
          >
            <Copy className="h-4 w-4" />
          </button>

          {/* Log Count */}
          <span className="text-xs text-muted-foreground">
            {filteredLogs.length} / {logs.length} logs
          </span>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-2 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search logs... (F to focus)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-sm px-2 py-1 rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 rounded hover:bg-accent"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Time Scrubber */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3 w-3" />
          <span>Time Range:</span>
          <input
            type="range"
            min={logs[0]?.timestamp || 0}
            max={logs[logs.length - 1]?.timestamp || Date.now()}
            value={timeRange[0]}
            onChange={(e) => handleTimeScrub(Number(e.target.value), timeRange[1])}
            className="flex-1"
            title="Start time range"
            aria-label="Start time range for log filtering"
          />
          <input
            type="range"
            min={logs[0]?.timestamp || 0}
            max={logs[logs.length - 1]?.timestamp || Date.now()}
            value={timeRange[1]}
            onChange={(e) => handleTimeScrub(timeRange[0], Number(e.target.value))}
            className="flex-1"
            title="End time range"
            aria-label="End time range for log filtering"
          />
          <button
            onClick={() =>
              setTimeRange([
                logs[0]?.timestamp || 0,
                logs[logs.length - 1]?.timestamp || Date.now(),
              ])
            }
            className="px-2 py-1 rounded border hover:bg-accent text-xs"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Log Container */}
      <div
        ref={containerRef}
        className="font-mono text-xs overflow-auto flex-1"
        style={{ height: containerHeight }} // eslint-disable-line react/style-prop-object
        onScroll={handleScroll}
        role="log"
        aria-label="Log output"
        aria-live="polite"
      >
        <div className="relative" style={{ height: filteredLogs.length * itemHeight }}>
          {' '}
          {/* eslint-disable-line react/style-prop-object */}
          <div className="absolute inset-0" style={{ transform: `translateY(${offsetY}px)` }}>
            {' '}
            {/* eslint-disable-line react/style-prop-object */}
            {visibleLogs.map((log, index) => {
              const globalIndex = startIndex + index
              const isSelected = selectedLogIndex === globalIndex

              return (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-center hover:bg-accent/30 cursor-pointer border-l-2 border-transparent',
                    isSelected && 'bg-accent border-l-primary',
                    log.level === 'error' && 'border-l-red-500',
                    log.level === 'warn' && 'border-l-yellow-500'
                  )}
                  style={{ height: itemHeight }} // eslint-disable-line react/style-prop-object
                  onClick={() => setSelectedLogIndex(isSelected ? null : globalIndex)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        'px-1 py-0.5 rounded text-xs font-medium uppercase',
                        getLogLevelColor(log.level)
                      )}
                    >
                      {log.level}
                    </span>
                    <span className="flex-1 min-w-0">
                      {highlightSearchTerm(log.message, searchTerm)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-3 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
          {autoScroll && <span className="text-green-600">● Auto-scroll enabled</span>}
          {isStreaming && <span className="text-green-600">● Live streaming</span>}
        </div>
        <div className="flex items-center gap-2">
          <span>Use [ ] to jump between errors/warnings</span>
          <span>•</span>
          <span>F: search</span>
          <span>•</span>
          <span>L: toggle auto-scroll</span>
        </div>
      </div>
    </div>
  )
}
