import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import VirtualizedLogViewer from '../../components/VirtualizedLogViewer'
import { useJobs } from '../../hooks/useJobs'

export default function JobRunPage() {
  const { jobId = 'unknown', runId = 'latest' } = useParams()
  const { getJob, addLog } = useJobs()
  const job = getJob(jobId)
  const run = job?.runs.find((r) => r.id === runId) ?? job?.runs[0]

  const simulateLog = async () => {
    if (!(job && run)) return
    const line = `[${new Date().toLocaleTimeString()}] Simulated log line ${Math.floor(Math.random() * 1000)}`
    try {
      await addLog(job.id, run.id, line)
    } catch (error) {
      console.error('Failed to add log:', error)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{job?.name ?? `Job ${jobId}`}</h3>
          <p className="text-sm text-muted-foreground">Run {run?.id ?? runId}</p>
        </div>
        <div className="flex gap-2">
          <Link to="logs" className="rounded-md border border-border px-3 py-1 text-sm">
            View Logs
          </Link>
          <Link to="artifacts" className="rounded-md border border-border px-3 py-1 text-sm">
            Artifacts
          </Link>
          <button
            onClick={simulateLog}
            className="rounded-md border border-border px-3 py-1 text-sm"
          >
            Simulate log
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {run ? (
            <StatusBadge status={run.status} />
          ) : (
            <span className="text-sm text-muted-foreground">No run found</span>
          )}
        </div>
        <div className="mt-3">
          <h4 className="text-sm font-semibold">Recent logs</h4>
          <div className="mt-2">
            <VirtualizedLogViewer logs={run?.logs || []} containerHeight={192} />
          </div>
        </div>
      </div>
    </div>
  )
}
