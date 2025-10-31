import { Outlet } from 'react-router-dom'

export default function JobsLayout() {
  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <p className="text-sm text-muted-foreground">
          Jobs are the primary unit — everything funnels to Job → Run → Logs/Artifacts
        </p>
      </header>

      <Outlet />
    </div>
  )
}
