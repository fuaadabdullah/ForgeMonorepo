import { Link } from 'react-router-dom'
import DataTable, { type Column, type DataTablePreset } from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { Job, Run } from '../../contexts/JobsContext'
import { useJobs } from '../../hooks/useJobs'

export default function JobsHomePage() {
  const { jobs, createRun, isLoading, error } = useJobs()

  const handleCreateRun = async (jobId: string) => {
    try {
      await createRun(jobId)
    } catch (error) {
      console.error('Failed to create run:', error)
      // Error will be handled by the context and displayed in UI
    }
  }

  // Define table columns
  const columns: Column<Job>[] = [
    {
      key: 'name',
      header: 'Job Name',
      width: 200,
      sortable: true,
      filterable: true,
      frozen: true,
      render: (value, row) => (
        <Link
          to={`/jobs/${row.id}/runs/${row.runs[0]?.id ?? 'latest'}`}
          className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'guild',
      header: 'Guild',
      width: 120,
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {value || 'forge'}
        </span>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      width: 150,
      sortable: true,
      filterable: true,
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: 180,
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'runs',
      header: 'Runs',
      width: 80,
      sortable: false,
      render: (value: Run[]) => value?.length || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2">
          <Link
            to={`/jobs/${row.id}/runs/${row.runs[0]?.id ?? 'latest'}`}
            className="rounded-md border border-border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Open latest run for job ${row.name}`}
          >
            Open
          </Link>
          <button
            onClick={() => handleCreateRun(row.id)}
            className="rounded-md border border-border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Start a new run for job ${row.name}`}
          >
            Start run
          </button>
        </div>
      ),
    },
  ]

  // Define table presets
  const presets: DataTablePreset[] = [
    {
      id: 'mine',
      name: 'Mine',
      filters: { guild: 'forge' }, // This would be dynamic based on current user
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    {
      id: 'last-24h',
      name: 'Last 24h',
      filters: {},
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    {
      id: 'failing-only',
      name: 'Failing Only',
      filters: { status: 'failed' }, // This would need to be implemented in the data
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
    {
      id: 'flaky-suspects',
      name: 'Flaky Suspects',
      filters: { flaky: true }, // This would need to be implemented in the data
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
  ]

  const handlePresetSelect = (preset: DataTablePreset) => {
    // Handle preset selection - could save to localStorage or send to analytics
    console.log('Selected preset:', preset.name)
  }

  const handleSaveView = (
    name: string,
    filters: Record<string, string | number | boolean>,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc'
  ) => {
    // Save view to localStorage or send to backend
    const view = { name, filters, sortBy, sortDirection }
    const savedViews = JSON.parse(localStorage.getItem('job-views') || '[]')
    savedViews.push(view)
    localStorage.setItem('job-views', JSON.stringify(savedViews))
    console.log('Saved view:', name)
  }

  const handleShareView = () => {
    // Share functionality is handled in the DataTable component
    console.log('Shared view')
  }

  const batchActions = [
    {
      label: 'Delete Selected',
      action: (selectedIds: (string | number)[]) => {
        console.log('Delete jobs:', selectedIds)
        // Implement batch delete
      },
      variant: 'danger' as const,
    },
    {
      label: 'Export',
      action: (selectedIds: (string | number)[]) => {
        console.log('Export jobs:', selectedIds)
        // Implement batch export
      },
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">All Jobs</h1>
        <Link
          to="/jobs/new"
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Create a new job"
        >
          Spawn Job
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8" aria-live="polite">
          <LoadingSpinner size="lg" />
          <span className="ml-2 text-sm text-muted-foreground">Loading jobs...</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4" role="alert">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!(isLoading || error) && jobs.length === 0 && (
        <div className="rounded-md border border-border p-4" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            No jobs yet — create one to see the Jobs → Run → Logs funnel in action.
          </p>
        </div>
      )}

      {!(isLoading || error) && jobs.length > 0 && (
        <DataTable
          data={jobs}
          columns={columns}
          keyField="id"
          presets={presets}
          onPresetSelect={handlePresetSelect}
          onSaveView={handleSaveView}
          onShareView={handleShareView}
          batchActions={batchActions}
          height={600}
          enableSelection={true}
        />
      )}
    </div>
  )
}
