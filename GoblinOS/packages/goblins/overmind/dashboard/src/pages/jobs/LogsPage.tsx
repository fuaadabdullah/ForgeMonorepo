import { FileText, Package, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ArtifactsViewer from '../../components/ArtifactsViewer'
import RightDrawer from '../../components/RightDrawer'
import VirtualizedLogViewer from '../../components/VirtualizedLogViewer'
import { useJobs } from '../../hooks/useJobs'

interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  id: string
}

interface Artifact {
  id: string
  name: string
  type: 'json' | 'markdown' | 'image' | 'sarif' | 'cyclonedx' | 'text' | 'unknown'
  content: string
  url?: string
  size?: number
  timestamp: number
}

export default function LogsPage() {
  const { jobId, runId } = useParams<{ jobId: string; runId: string }>()
  const { jobs, addLog } = useJobs()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerContent, setDrawerContent] = useState<'logs' | 'artifacts'>('logs')
  const [drawerTitle, setDrawerTitle] = useState('')

  const job = jobs.find((j) => j.id === jobId)
  const run = job?.runs.find((r) => r.id === runId)

  // Initialize logs from the run data
  useEffect(() => {
    if (run?.logs) {
      setLogs(run.logs)
    }
  }, [run?.logs])

  // Mock artifacts data
  useEffect(() => {
    const mockArtifacts: Artifact[] = [
      {
        id: '1',
        name: 'build-report.json',
        type: 'json',
        content: JSON.stringify(
          {
            buildId: '12345',
            status: 'success',
            duration: '2m 30s',
            tests: { passed: 45, failed: 0, skipped: 2 },
          },
          null,
          2
        ),
        size: 1024,
        timestamp: Date.now() - 3600000,
      },
      {
        id: '2',
        name: 'security-scan.sarif',
        type: 'sarif',
        content: JSON.stringify(
          {
            version: '2.1.0',
            runs: [
              {
                tool: { driver: { name: 'Security Scanner' } },
                results: [
                  {
                    ruleId: 'CWE-79',
                    level: 'warning',
                    message: { text: 'Potential XSS vulnerability' },
                    locations: [
                      {
                        physicalLocation: {
                          artifactLocation: { uri: 'src/main.js' },
                          region: { startLine: 42 },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          null,
          2
        ),
        size: 2048,
        timestamp: Date.now() - 1800000,
      },
      {
        id: '3',
        name: 'sbom.json',
        type: 'cyclonedx',
        content: JSON.stringify(
          {
            bomFormat: 'CycloneDX',
            specVersion: '1.4',
            components: [
              {
                name: 'react',
                version: '18.2.0',
                type: 'library',
                licenses: [{ license: { id: 'MIT' } }],
              },
              {
                name: 'lodash',
                version: '4.17.21',
                type: 'library',
                licenses: [{ license: { id: 'MIT' } }],
              },
            ],
          },
          null,
          2
        ),
        size: 3072,
        timestamp: Date.now() - 900000,
      },
    ]
    setArtifacts(mockArtifacts)
  }, [])

  const handleStreamToggle = useCallback(
    (enabled: boolean) => {
      setIsStreaming(enabled)
      if (enabled) {
        // Start mock streaming
        const interval = setInterval(() => {
          const mockLog: LogEntry = {
            timestamp: Date.now(),
            level: Math.random() > 0.9 ? 'error' : Math.random() > 0.7 ? 'warn' : 'info',
            message: `Mock log message at ${new Date().toLocaleTimeString()}`,
            id: `log-${Date.now()}`,
          }
          setLogs((prev) => [...prev, mockLog])
          addLog(jobId!, runId!, mockLog.message)
        }, 2000)

        return () => clearInterval(interval)
      }
    },
    [jobId, runId, addLog]
  )

  const handleCopyFiltered = useCallback((filteredLogs: LogEntry[]) => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
      )
      .join('\n')

    navigator.clipboard.writeText(logText)
  }, [])

  const handleArtifactSelect = useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact)
    setDrawerContent('artifacts')
    setDrawerTitle(`Artifact: ${artifact.name}`)
    setDrawerOpen(true)
  }, [])

  const handleCopyArtifact = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const handleDownloadArtifact = useCallback((artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = artifact.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  if (!(job && run)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Job or Run Not Found</h2>
          <p className="text-muted-foreground">The requested job run could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold">Job Run Logs</h1>
          <p className="text-sm text-muted-foreground">
            {job.name} • Run {run.id} • Started {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDrawerContent('logs')
              setDrawerTitle('Log Details')
              setDrawerOpen(true)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            View Logs
          </button>
          <button
            onClick={() => {
              setDrawerContent('artifacts')
              setDrawerTitle('Artifacts')
              setDrawerOpen(true)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent"
          >
            <Package className="h-4 w-4" />
            View Artifacts
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Logs Section */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Live Logs</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStreamToggle(!isStreaming)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
                    isStreaming
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}
                >
                  {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {isStreaming ? 'Stop' : 'Start'} Stream
                </button>
              </div>
            </div>
            <div className="flex-1">
              <VirtualizedLogViewer
                logs={logs}
                enableLiveStreaming={true}
                onStreamToggle={handleStreamToggle}
                isStreaming={isStreaming}
                onCopyFiltered={handleCopyFiltered}
                containerHeight={400}
              />
            </div>
          </div>

          {/* Artifacts Section */}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Artifacts</h2>
            <div className="flex-1">
              <ArtifactsViewer
                artifacts={artifacts}
                selectedArtifact={selectedArtifact}
                onArtifactSelect={handleArtifactSelect}
                onCopyContent={handleCopyArtifact}
                onDownload={handleDownloadArtifact}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer */}
      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        size="lg"
      >
        {drawerContent === 'logs' && (
          <VirtualizedLogViewer
            logs={logs}
            enableLiveStreaming={true}
            onStreamToggle={handleStreamToggle}
            isStreaming={isStreaming}
            onCopyFiltered={handleCopyFiltered}
            containerHeight={500}
          />
        )}
        {drawerContent === 'artifacts' && selectedArtifact && (
          <ArtifactsViewer
            artifacts={artifacts}
            selectedArtifact={selectedArtifact}
            onArtifactSelect={setSelectedArtifact}
            onCopyContent={handleCopyArtifact}
            onDownload={handleDownloadArtifact}
          />
        )}
      </RightDrawer>
    </div>
  )
}
