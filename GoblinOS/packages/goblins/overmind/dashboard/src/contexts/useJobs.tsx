import { useContext } from 'react'
import { JobsContext } from './JobsContext'

export function useJobs() {
  const ctx = useContext(JobsContext)
  if (!ctx) throw new Error('useJobs must be used within JobsProvider')
  return ctx
}
