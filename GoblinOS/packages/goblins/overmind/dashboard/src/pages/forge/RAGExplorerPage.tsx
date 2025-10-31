import { Book, Library, Search, Sparkles } from 'lucide-react'
import {
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react'
import {
  useAddTestData,
  useDeleteDocument,
  useDocuments,
  useRAGStats,
  useSearchDocuments,
  useUploadDocument,
} from '../../hooks/controlCenter/useRAGExplorer'
import type { Document, DocumentMetadata, SearchResult } from '../../lib/controlCenter/types'
import { cn } from '../../lib/utils'

export function RAGExplorerPanel() {
  const extractMetadata = (metadata: Document['metadata']): DocumentMetadata => {
    if (!metadata || typeof metadata !== 'object') {
      return {}
    }

    const typed = metadata as DocumentMetadata
    const safeTags = Array.isArray(typed.tags)
      ? typed.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined

    return {
      ...typed,
      ...(typeof typed.category === 'string' ? { category: typed.category } : {}),
      ...(safeTags ? { tags: safeTags } : {}),
    }
  }

  const highlightText = (text: string, query: string): ReactNode => {
    if (!query.trim()) return text
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    const segments = text.split(regex)
    const queryLower = query.toLowerCase()

    return segments.map((segment, index) => {
      if (segment.toLowerCase() === queryLower) {
        return (
          <mark key={`highlight-${index}`} className="bg-primary/40 text-primary-foreground">
            {segment}
          </mark>
        )
      }
      return <span key={`segment-${index}`}>{segment}</span>
    })
  }

  const handleCardKeyPress = (event: KeyboardEvent<HTMLDivElement>, doc: Document) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedDocument(doc)
    }
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadMetadata, setUploadMetadata] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const documentsQuery = useDocuments()
  const statsQuery = useRAGStats()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()
  const searchMutation = useSearchDocuments()
  const addTestDataMutation = useAddTestData()

  const fallbackDocuments: Document[] = [
    {
      id: 'grimoire-1',
      title: 'Forge Ops Handbook',
      content:
        'Guidelines for orchestrating multi-provider Forge goblin fleets with optimal latency.',
      metadata: { category: 'playbook', tags: ['ops', 'latency'] },
    },
    {
      id: 'grimoire-2',
      title: 'Model Pairings',
      content: 'Recommended pairings between routing intents and Ollama or cloud models.',
      metadata: { category: 'models', tags: ['routing', 'best-practices'] },
    },
  ] as Document[]

  const fallbackStats = {
    totalDocuments: fallbackDocuments.length,
    totalTokens: 125_000,
    averageDocumentLength: 620,
    indexSize: 'Arcane cache',
  }

  const usingFallback = documentsQuery.isError || statsQuery.isError
  const documents = documentsQuery.data ?? fallbackDocuments
  const stats = statsQuery.data ?? fallbackStats

  const disableMutations = usingFallback

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!searchQuery.trim()) return

    if (disableMutations) {
      const fauxResults: SearchResult[] = fallbackDocuments.map((doc) => ({
        document: doc,
        score: 0.96,
        highlights: ['Fallback semantic insight available while the Forge index warms up.'],
      }))
      setSearchResults(fauxResults)
      return
    }

    try {
      const results = await searchMutation.mutateAsync({
        query: searchQuery,
        limit: 10,
        threshold: 0.5,
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    }
  }

  const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    if (disableMutations) {
      setUploadTitle('')
      setUploadMetadata('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (uploadTitle.trim()) {
      formData.append('title', uploadTitle.trim())
    }
    if (uploadMetadata.trim()) {
      formData.append('metadata', uploadMetadata.trim())
    }

    try {
      await uploadMutation.mutateAsync(formData)
      setUploadTitle('')
      setUploadMetadata('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    if (disableMutations) {
      setSelectedDocument(null)
      return
    }

    try {
      await deleteMutation.mutateAsync(docId)
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null)
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleAddTestData = async () => {
    if (disableMutations) {
      setSearchResults(
        fallbackDocuments.map((doc) => ({ document: doc, score: 0.92, highlights: [] }))
      )
      return
    }

    try {
      await addTestDataMutation.mutateAsync()
    } catch (error) {
      console.error('Adding test data failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-foreground">📚 Forge RAG Explorer</h2>
          <p className="text-sm text-muted-foreground">
            Maintain your enchanted knowledge base.{' '}
            {usingFallback
              ? 'Sample scrolls loaded while live vector index connects.'
              : 'Upload scrolls and search them with semantic magic.'}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            usingFallback ? 'bg-accent/40 text-accent-foreground' : 'bg-primary/20 text-primary'
          )}
        >
          {usingFallback ? 'Arcane Fallback' : 'Live Index'}
        </div>
      </header>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Library}
          label="Documents"
          value={`${stats.totalDocuments}`}
          description="Curated Forge scrolls"
        />
        <StatCard
          icon={Sparkles}
          label="Tokens"
          value={stats.totalTokens.toLocaleString()}
          description="Embedding tokens infused"
        />
        <StatCard
          icon={Book}
          label="Avg Length"
          value={`${stats.averageDocumentLength}`}
          description="Mean parchment span"
        />
        <StatCard
          icon={Search}
          label="Index"
          value={stats.indexSize ?? 'Enchanted cache'}
          description="Storage plane"
        />
      </div>

      <div className="rag-content">
        {/* Upload Section */}
        <div className="rag-section">
          <h3>Upload Documents</h3>
          <form onSubmit={handleFileUpload} className="upload-form">
            <div className="form-group">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json"
                required
                aria-label="Select document file"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title (optional)"
                aria-label="Document title"
              />
            </div>
            <div className="form-group">
              <textarea
                value={uploadMetadata}
                onChange={(e) => setUploadMetadata(e.target.value)}
                placeholder='Metadata JSON (optional, e.g., {"category": "docs", "tags": ["guide"]})'
                rows={2}
                aria-label="Document metadata"
              />
            </div>
            <button
              type="submit"
              disabled={uploadMutation.isPending || disableMutations}
              className={cn('btn-primary', disableMutations && 'cursor-not-allowed opacity-50')}
            >
              {uploadMutation.isPending
                ? 'Uploading…'
                : disableMutations
                  ? 'Simulated Upload'
                  : 'Upload Document'}
            </button>
          </form>

          <div className="test-data-section">
            <button
              onClick={handleAddTestData}
              disabled={addTestDataMutation.isPending}
              className="btn-secondary"
            >
              {addTestDataMutation.isPending
                ? 'Adding…'
                : disableMutations
                  ? 'Load Demo Scrolls'
                  : 'Add Sample Documents'}
            </button>
            <p className="help-text">Add sample documentation for testing the RAG system.</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="rag-section">
          <h3>Semantic Search</h3>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your knowledge base..."
                aria-label="Search query"
              />
              <button
                type="submit"
                disabled={!(searchQuery.trim() || disableMutations) || searchMutation.isPending}
                className="btn-primary"
              >
                {searchMutation.isPending ? 'Searching…' : disableMutations ? 'Simulate' : 'Search'}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Search Results ({searchResults.length})</h4>
              <div className="results-list">
                {searchResults.map((result, index) => (
                  <button
                    type="button"
                    key={index}
                    className="result-item text-left"
                    onClick={() => setSelectedDocument(result.document)}
                  >
                    <div className="result-header">
                      <h5>{result.document.title}</h5>
                      <span className="result-score">
                        Score: {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="result-highlights">
                      {result.highlights.slice(0, 2).map((highlight, hIndex) => (
                        <p key={hIndex} className="highlight">
                          {highlightText(highlight, searchQuery)}
                        </p>
                      ))}
                    </div>
                    {extractMetadata(result.document.metadata).category && (
                      <div className="result-meta">
                        <span className="category">
                          {extractMetadata(result.document.metadata).category}
                        </span>
                        {extractMetadata(result.document.metadata).tags && (
                          <div className="tags">
                            {extractMetadata(result.document.metadata).tags!.map((tag, tIndex) => (
                              <span key={tIndex} className="tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="rag-section">
          <h3 className="flex items-center justify-between text-lg font-semibold text-primary-foreground">
            <span>Knowledge Base ({documents.length} documents)</span>
            {usingFallback && (
              <span className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                Demo Library
              </span>
            )}
          </h3>
          {documentsQuery.isLoading && !usingFallback ? (
            <p className="text-sm text-muted-foreground">
              <span className="loader mr-2" /> Loading documents…
            </p>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'rounded-xl border border-primary/20 bg-card/70 p-4 transition hover:border-primary/50',
                    selectedDocument?.id === doc.id && 'ring-2 ring-primary/60'
                  )}
                  onClick={() => setSelectedDocument(doc)}
                  onKeyDown={(event) => handleCardKeyPress(event, doc)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-primary-foreground">
                        {doc.title ?? 'Untitled Scroll'}
                      </h4>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{doc.content.length} chars</span>
                        {extractMetadata(doc.metadata).category && (
                          <span className="uppercase tracking-wide">
                            {extractMetadata(doc.metadata).category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDocument(doc)
                        }}
                        className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary/10"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.id)
                        }}
                        disabled={deleteMutation.isPending || disableMutations}
                        className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {extractMetadata(doc.metadata).tags && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {extractMetadata(doc.metadata).tags!.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/15 px-2 py-1 text-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div
          className="modal-overlay"
          aria-label="Close document viewer"
          onClick={() => setSelectedDocument(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setSelectedDocument(null)
            }
          }}
        >
          <div
            className="modal-content"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setSelectedDocument(null)
              }
            }}
          >
            <div className="modal-header">
              <h3>{selectedDocument.title}</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="modal-close"
                aria-label="Close document viewer"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {selectedDocument.metadata && Object.keys(selectedDocument.metadata).length > 0 && (
                <div className="document-metadata">
                  <h4>Metadata</h4>
                  <pre>{JSON.stringify(selectedDocument.metadata, null, 2)}</pre>
                </div>
              )}
              <div className="document-content">
                <h4>Content</h4>
                <pre>{selectedDocument.content}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  value: string | number
  label: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-card/70 p-4 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-xl font-bold text-primary-foreground">{value}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
