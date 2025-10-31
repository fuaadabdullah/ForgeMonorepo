import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'

// State Components
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {/* Skeleton shimmer - under 600ms */}
      <div className="w-full max-w-sm space-y-3">
        <div className="h-4 bg-muted animate-pulse rounded duration-600" />
        <div className="h-4 bg-muted animate-pulse rounded w-3/4 duration-600 delay-100" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2 duration-600 delay-200" />
      </div>
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
  onViewLogs,
}: {
  message: string
  onRetry?: () => void
  onViewLogs?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-destructive font-medium">Error</div>
        <div className="text-sm text-muted-foreground max-w-sm">{message}</div>
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors duration-200 shadow-soft'
            )}
          >
            Retry
          </button>
        )}
        {onViewLogs && (
          <button
            onClick={onViewLogs}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'border border-border bg-background hover:bg-accent',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors duration-200 shadow-soft'
            )}
          >
            View Logs
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  message,
  onNewJob,
  onUseTemplate,
  onPasteExample,
}: {
  message: string
  onNewJob?: () => void
  onUseTemplate?: () => void
  onPasteExample?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-muted-foreground">{message}</div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {onNewJob && (
          <button
            onClick={onNewJob}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors duration-200 shadow-soft'
            )}
          >
            New Job
          </button>
        )}
        {onUseTemplate && (
          <button
            onClick={onUseTemplate}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'border border-border bg-background hover:bg-accent',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors duration-200 shadow-soft'
            )}
          >
            Use Template
          </button>
        )}
        {onPasteExample && (
          <button
            onClick={onPasteExample}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'border border-border bg-background hover:bg-accent',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors duration-200 shadow-soft'
            )}
          >
            Paste Example JSON
          </button>
        )}
      </div>
    </div>
  )
}

interface RightDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'left' | 'right'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  backdropBlur?: boolean
  className?: string
  // State management
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  errorMessage?: string
  emptyMessage?: string
  // Actions
  onRetry?: () => void
  onViewLogs?: () => void
  onNewJob?: () => void
  onUseTemplate?: () => void
  onPasteExample?: () => void
}

export default function RightDrawer({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = 'md',
  position = 'right',
  // State management
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorMessage,
  emptyMessage = 'No items to display',
  // Actions
  onRetry,
  onViewLogs,
  onNewJob,
  onUseTemplate,
  onPasteExample,
}: RightDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Focus management
  const focusableElements = useCallback(() => {
    if (!drawerRef.current) return []
    return drawerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      // Handle Escape key
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Handle Tab key for focus trapping
      if (e.key === 'Tab') {
        const focusable = Array.from(focusableElements())
        if (focusable.length === 0) return

        const firstElement = focusable[0]
        const lastElement = focusable[focusable.length - 1]

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    },
    [isOpen, closeOnEscape, onClose, focusableElements]
  )

  // Handle escape key and focus trapping
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown)

      // Focus first focusable element or drawer itself
      setTimeout(() => {
        if (drawerRef.current) {
          const focusable = focusableElements()
          if (focusable.length > 0) {
            focusable[0].focus()
          } else {
            drawerRef.current.focus()
          }
        }
      }, 100) // Small delay to ensure DOM is ready
    } else {
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }

      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown, focusableElements])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [isOpen])

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300) // Match transition duration
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnBackdropClick, onClose]
  )

  // Render state components
  const renderStateContent = () => {
    if (isLoading) {
      return <LoadingState />
    }

    if (isError) {
      return (
        <ErrorState
          message={errorMessage || 'Something went wrong'}
          onRetry={onRetry}
          onViewLogs={onViewLogs}
        />
      )
    }

    if (isEmpty) {
      return (
        <EmptyState
          message={emptyMessage}
          onNewJob={onNewJob}
          onUseTemplate={onUseTemplate}
          onPasteExample={onPasteExample}
        />
      )
    }

    return children
  }

  // Don't render anything if not open and not animating
  if (!(isOpen || isAnimating)) return null

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-all duration-300 ease-out',
          'bg-black/50 backdrop-blur-sm',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 h-full z-50',
          'bg-background border-border shadow-soft',
          'transform transition-all duration-300 ease-out',
          'focus:outline-none rounded-l-xl',
          position === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          isOpen
            ? position === 'right'
              ? 'translate-x-0'
              : 'translate-x-0'
            : position === 'right'
              ? 'translate-x-full'
              : '-translate-x-full',
          size === 'full'
            ? 'w-screen'
            : size === 'xl'
              ? 'w-[800px]'
              : size === 'lg'
                ? 'w-[600px]'
                : size === 'md'
                  ? 'w-[400px]'
                  : 'w-[320px]',
          'max-w-[100vw]',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby="drawer-content"
        tabIndex={-1}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-border bg-background/95 backdrop-blur-sm rounded-t-xl">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 id="drawer-title" className="text-xl font-semibold text-foreground truncate pr-4">
                {title}
              </h2>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(
                'flex-shrink-0 p-2 rounded-lg',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-accent focus:bg-accent',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-colors duration-200'
              )}
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* Content */}
        <main
          id="drawer-content"
          className="flex-1 overflow-y-auto p-6 focus:outline-none"
          tabIndex={-1}
        >
          {renderStateContent()}
        </main>
      </div>
    </>
  )

  // Render in portal to avoid z-index issues
  return createPortal(drawerContent, document.body)
}
