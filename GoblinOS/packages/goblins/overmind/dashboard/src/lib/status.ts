export type Status = 'idle' | 'queued' | 'running' | 'flaky' | 'failed' | 'degraded' | 'succeeded'

export const statusConfig = {
  idle: {
    label: 'Idle',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-200',
    description: 'System is idle and ready',
  },
  queued: {
    label: 'Queued',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    description: 'Task is waiting in queue',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    description: 'Task is currently executing',
  },
  flaky: {
    label: 'Flaky',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    description: 'Task has intermittent failures',
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    description: 'Task has failed',
  },
  degraded: {
    label: 'Degraded',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    description: 'Task is running with issues',
  },
  succeeded: {
    label: 'Succeeded',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    description: 'Task completed successfully',
  },
} as const
