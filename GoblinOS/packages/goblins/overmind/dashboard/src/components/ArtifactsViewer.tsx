import { Code, Copy, Download, ExternalLink, FileText, Image, Package, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../lib/utils'

interface Artifact {
  id: string
  name: string
  type: 'json' | 'markdown' | 'image' | 'sarif' | 'cyclonedx' | 'text' | 'unknown'
  content: string
  url?: string
  size?: number
  timestamp: number
}

interface ArtifactsViewerProps {
  artifacts: Artifact[]
  selectedArtifact?: Artifact
  onArtifactSelect?: (artifact: Artifact) => void
  onCopyContent?: (content: string) => void
  onDownload?: (artifact: Artifact) => void
  className?: string
}

interface SARIFResult {
  ruleId?: string
  level?: string
  message?: { text?: string }
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri?: string }
      region?: { startLine?: number }
    }
  }>
}

interface CycloneDXLicense {
  license?: { id?: string; name?: string }
}

interface CycloneDXComponent {
  name?: string
  version?: string
  type?: string
  licenses?: CycloneDXLicense[]
}

export default function ArtifactsViewer({
  artifacts,
  selectedArtifact,
  onArtifactSelect,
  onCopyContent,
  onDownload,
  className,
}: ArtifactsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | Artifact['type']>('all')

  // Filter artifacts based on search and type
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      const matchesSearch =
        searchTerm === '' ||
        artifact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artifact.content.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === 'all' || artifact.type === filterType

      return matchesSearch && matchesType
    })
  }, [artifacts, searchTerm, filterType])

  const getArtifactIcon = (type: Artifact['type']) => {
    switch (type) {
      case 'json':
        return <Code className="h-4 w-4" />
      case 'markdown':
        return <FileText className="h-4 w-4" />
      case 'image':
        return <Image className="h-4 w-4" />
      case 'sarif':
        return <Shield className="h-4 w-4" />
      case 'cyclonedx':
        return <Package className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getArtifactTypeColor = (type: Artifact['type']) => {
    switch (type) {
      case 'json':
        return 'text-blue-600 bg-blue-50'
      case 'markdown':
        return 'text-gray-600 bg-gray-50'
      case 'image':
        return 'text-green-600 bg-green-50'
      case 'sarif':
        return 'text-red-600 bg-red-50'
      case 'cyclonedx':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
  }

  // Lightweight helpers for safe markdown rendering (avoid dangerouslySetInnerHTML)
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = []
    const re = /(`[^`]+`)|\*\*(.*?)\*\*|\*(.*?)\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    // Avoid assignment in expression to satisfy lint rule
    // Use an explicit loop to iterate RegExp exec results
    // eslint-disable-next-line no-constant-condition
    for (;;) {
      match = re.exec(text)
      if (!match) break
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index))
      }
      if (match[1]) {
        nodes.push(<code key={nodes.length}>{match[1].slice(1, -1)}</code>)
      } else if (match[2]) {
        nodes.push(<strong key={nodes.length}>{match[2]}</strong>)
      } else if (match[3]) {
        nodes.push(<em key={nodes.length}>{match[3]}</em>)
      }
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
    return nodes
  }

  const renderMarkdownToElements = (md: string) => {
    const paras = md.split(/\n{2,}/g)
    return paras.map((para, idx) => {
      const lines = para.split(/\n/g)
      const first = lines[0] || ''
      if (/^###\s+/.test(first)) {
        return (
          <h3 key={idx} className="mt-0 mb-2">
            {renderInline(first.replace(/^###\s+/, ''))}
          </h3>
        )
      }
      if (/^##\s+/.test(first)) {
        return (
          <h2 key={idx} className="mt-0 mb-2">
            {renderInline(first.replace(/^##\s+/, ''))}
          </h2>
        )
      }
      if (/^#\s+/.test(first)) {
        return (
          <h1 key={idx} className="mt-0 mb-2">
            {renderInline(first.replace(/^#\s+/, ''))}
          </h1>
        )
      }

      return (
        <p key={idx} className="mb-2">
          {lines.flatMap((ln, i) => (
            <span key={i}>
              {renderInline(ln)}
              {i < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      )
    })
  }

  const renderArtifactContent = (artifact: Artifact) => {
    switch (artifact.type) {
      case 'json':
        return (
          <pre className="text-xs overflow-auto bg-muted p-4 rounded-md">
            <code className="language-json">
              {JSON.stringify(JSON.parse(artifact.content), null, 2)}
            </code>
          </pre>
        )

      case 'markdown':
        return (
          <div className="prose prose-sm max-w-none p-4 bg-muted rounded-md">
            {renderMarkdownToElements(artifact.content)}
          </div>
        )

      case 'image':
        return (
          <div className="flex justify-center p-4 bg-muted rounded-md">
            <img
              src={artifact.url || `data:image;base64,${artifact.content}`}
              alt={artifact.name}
              className="max-w-full max-h-96 object-contain rounded"
            />
          </div>
        )

      case 'sarif':
        try {
          const sarif = JSON.parse(artifact.content)
          return (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tool:</strong> {sarif.runs?.[0]?.tool?.driver?.name}
                </div>
                <div>
                  <strong>Results:</strong> {sarif.runs?.[0]?.results?.length || 0}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Results:</h4>
                {sarif.runs?.[0]?.results
                  ?.slice(0, 10)
                  .map((result: SARIFResult, index: number) => (
                    <div key={index} className="border rounded p-2 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'px-1 py-0.5 rounded text-xs',
                            result.level === 'error'
                              ? 'bg-red-100 text-red-700'
                              : result.level === 'warning'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {result.level}
                        </span>
                        <span className="font-mono">{result.ruleId}</span>
                      </div>
                      <div>{result.message?.text}</div>
                      {result.locations?.[0] && (
                        <div className="text-muted-foreground mt-1">
                          {result.locations[0].physicalLocation?.artifactLocation?.uri}:
                          {result.locations[0].physicalLocation?.region?.startLine}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )
        } catch {
          return (
            <pre className="text-xs overflow-auto p-4 bg-muted rounded-md">{artifact.content}</pre>
          )
        }

      case 'cyclonedx':
        try {
          const sbom = JSON.parse(artifact.content)
          return (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Spec Version:</strong> {sbom.specVersion}
                </div>
                <div>
                  <strong>Components:</strong> {sbom.components?.length || 0}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Top Components:</h4>
                {sbom.components
                  ?.slice(0, 10)
                  .map((component: CycloneDXComponent, index: number) => (
                    <div key={index} className="border rounded p-2 text-xs">
                      <div className="font-medium">{component.name}</div>
                      <div className="text-muted-foreground">
                        {component.version} • {component.type}
                      </div>
                      {component.licenses && (
                        <div className="mt-1">
                          License:{' '}
                          {component.licenses
                            ?.map((l: CycloneDXLicense) => l.license?.id || l.license?.name)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )
        } catch {
          return (
            <pre className="text-xs overflow-auto p-4 bg-muted rounded-md">{artifact.content}</pre>
          )
        }

      default:
        return (
          <pre className="text-xs overflow-auto p-4 bg-muted rounded-md whitespace-pre-wrap">
            {artifact.content}
          </pre>
        )
    }
  }

  if (artifacts.length === 0) {
    return (
      <div className={cn('rounded-md border border-border p-8 text-center', className)}>
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No artifacts available</p>
      </div>
    )
  }

  return (
    <div className={cn('flex rounded-md border border-border', className)}>
      {/* Artifacts List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Search and Filter */}
        <div className="p-3 border-b border-border space-y-2">
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as Artifact['type'] | 'all')}
            className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            title="Filter artifacts by type"
          >
            <option value="all">All Types</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="image">Images</option>
            <option value="sarif">SARIF</option>
            <option value="cyclonedx">CycloneDX</option>
            <option value="text">Text</option>
          </select>
        </div>

        {/* Artifacts List */}
        <div className="flex-1 overflow-auto">
          {filteredArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              className={cn(
                'p-3 border-b border-border text-left cursor-pointer hover:bg-accent/30',
                selectedArtifact?.id === artifact.id && 'bg-accent'
              )}
              onClick={() => onArtifactSelect?.(artifact)}
            >
              <div className="flex items-start gap-2">
                {getArtifactIcon(artifact.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{artifact.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs',
                        getArtifactTypeColor(artifact.type)
                      )}
                    >
                      {artifact.type.toUpperCase()}
                    </span>
                    {artifact.size && (
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(artifact.size)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(artifact.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {filteredArtifacts.length} of {artifacts.length} artifacts
        </div>
      </div>

      {/* Artifact Content */}
      <div className="flex-1 flex flex-col">
        {selectedArtifact ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getArtifactIcon(selectedArtifact.type)}
                <span className="font-medium">{selectedArtifact.name}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs',
                    getArtifactTypeColor(selectedArtifact.type)
                  )}
                >
                  {selectedArtifact.type.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCopyContent?.(selectedArtifact.content)}
                  className="p-1 rounded hover:bg-accent"
                  title="Copy content"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {selectedArtifact.url && (
                  <a
                    href={selectedArtifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-accent"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => onDownload?.(selectedArtifact)}
                  className="p-1 rounded hover:bg-accent"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">{renderArtifactContent(selectedArtifact)}</div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>Select an artifact to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
