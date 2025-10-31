import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobs } from '../../hooks/useJobs'

export default function NewJobPage() {
  const [name, setName] = useState('')
  const [guild, setGuild] = useState('forge')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createJob, createRun } = useJobs()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const job = await createJob({ name: name.trim(), guild })
      const run = await createRun(job.id)
      // navigate to job run page
      navigate(`/jobs/${job.id}/runs/${run?.id}`)
    } catch (error) {
      console.error('Failed to create job:', error)
      // TODO: show error message to user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Spawn Job</h1>
      <form
        onSubmit={submit}
        className="mt-4 max-w-md space-y-3"
        aria-labelledby="spawn-job-heading"
      >
        <div id="spawn-job-heading" className="sr-only">
          Create a new job form
        </div>
        <div>
          <label htmlFor="job-name" className="block text-sm font-medium text-muted-foreground">
            Job name <span className="text-destructive">*</span>
          </label>
          <input
            id="job-name"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. nightly-index-build"
            aria-describedby="job-name-help"
            disabled={isSubmitting}
          />
          <div id="job-name-help" className="sr-only">
            Enter a descriptive name for your job
          </div>
        </div>

        <div>
          <label htmlFor="job-guild" className="block text-sm font-medium text-muted-foreground">
            Guild <span className="text-destructive">*</span>
          </label>
          <select
            id="job-guild"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={guild}
            onChange={(e) => setGuild(e.target.value)}
            aria-describedby="job-guild-help"
            disabled={isSubmitting}
          >
            <option value="forge">Forge</option>
            <option value="crafters">Crafters</option>
            <option value="huntress">Huntress</option>
            <option value="keepers">Keepers</option>
            <option value="mages">Mages</option>
          </select>
          <div id="job-guild-help" className="sr-only">
            Select the guild that will own this job
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-describedby={isSubmitting ? 'submitting-status' : undefined}
          >
            {isSubmitting ? 'Spawning...' : 'Spawn'}
          </button>
          {isSubmitting && (
            <div id="submitting-status" className="sr-only" role="status" aria-live="polite">
              Creating job and starting initial run
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
