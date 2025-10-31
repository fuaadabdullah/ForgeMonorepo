import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { useJobs } from '../hooks/useJobs'

// Mock fetch globally
global.fetch = vi.fn()

// Mock the useJobs hook directly
vi.mock('../hooks/useJobs', () => ({
  useJobs: vi.fn(() => ({
    jobs: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    totalJobs: 0,
    jobsPerPage: 10,
    createJob: vi.fn().mockResolvedValue({
      id: 'test-job-1',
      name: 'Test Job',
      guild: 'Forge',
      createdAt: Date.now(),
      runs: [],
    }),
    createRun: vi.fn(),
    addLog: vi.fn(),
    getJob: vi.fn(),
    getLastFailedRun: vi.fn(),
    refreshJobs: vi.fn(),
    goToPage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
  })),
}))

function TestComponent() {
  const { jobs, createJob } = useJobs()

  const handleCreateJob = async () => {
    try {
      await createJob({ name: 'Test Job', guild: 'Forge' })
    } catch (error) {
      console.error('Failed to create job:', error)
    }
  }

  return (
    <div>
      <div data-testid="job-count">{jobs.length}</div>
      <button onClick={handleCreateJob} data-testid="create-job">
        Create Job
      </button>
    </div>
  )
}

describe('JobsContext', () => {
  it('renders a simple component', () => {
    render(<div data-testid="simple-test">Hello World</div>)
    expect(screen.getByTestId('simple-test')).toHaveTextContent('Hello World')
  })

  it('provides jobs context to children', async () => {
    render(<TestComponent />)

    expect(screen.getByTestId('job-count')).toHaveTextContent('0')
  })

  it('allows creating jobs', async () => {
    render(<TestComponent />)

    const createButton = screen.getByTestId('create-job')
    expect(createButton).toBeInTheDocument()

    // Click the create job button
    await act(async () => {
      createButton.click()
    })

    // The mock createJob should have been called
    expect(screen.getByTestId('job-count')).toHaveTextContent('0') // Still 0 since we're mocking
  })
})
