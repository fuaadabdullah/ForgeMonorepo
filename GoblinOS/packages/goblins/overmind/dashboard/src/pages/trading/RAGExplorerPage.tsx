import { BookOpen, Database, Search, Sparkles } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'
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

export function TradingRAGExplorerPanel() {
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

  const handleDocumentKeyToggle = (event: KeyboardEvent<HTMLElement>, doc: Document) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)
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
      id: 'market-brief-1',
      title: 'Daily Macro Briefing',
      content: 'Summary of macro indicators and sentiment for daily trading preparation.',
      metadata: { category: 'macro', tags: ['outlook', 'macro'] },
    },
    {
      id: 'strategy-notes-2',
      title: 'Volatility Playbook',
      content: 'Guidelines for deploying volatility strategies during high VIX conditions.',
      metadata: { category: 'strategy', tags: ['volatility', 'risk'] },
    },
  ] as Document[]

  const fallbackStats = {
    totalDocuments: fallbackDocuments.length,
    totalTokens: 92_000,
    averageDocumentLength: 540,
    indexSize: 'Local cache',
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
        score: 0.94,
        highlights: ['Fallback intelligence available while market index syncs.'],
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
    if (!confirm('Remove this intelligence brief from the index?')) return

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
          <h2 className="text-2xl font-bold text-primary-foreground">
            📚 Market Intelligence Vault
          </h2>
          <p className="text-sm text-muted-foreground">
            Maintain curated research, execution playbooks, and sentiment briefs.
            {usingFallback
              ? ' Sample dossiers loaded while the knowledge index connects.'
              : ' Upload fresh intel and query the index with semantic search.'}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            usingFallback ? 'bg-accent/40 text-accent-foreground' : 'bg-primary/20 text-primary'
          )}
        >
          {usingFallback ? 'Offline Cache' : 'Live Index'}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Database}
          label="Documents"
          value={`${stats.totalDocuments}`}
          description="Research briefs indexed"
        />
        <StatCard
          icon={Sparkles}
          label="Tokens"
          value={stats.totalTokens.toLocaleString()}
          description="Tokens embedded"
        />
        <StatCard
          icon={BookOpen}
          label="Avg Length"
          value={`${stats.averageDocumentLength}`}
          description="Avg. brief length"
        />
        <StatCard
          icon={Search}
          label="Storage"
          value={stats.indexSize?.toString() ?? 'Local cache'}
          description="Index footprint"
        />
      </div>

      <div className="rag-content">
        <div className="rag-section">
          <h3>Upload Intelligence</h3>
          <form onSubmit={handleFileUpload} className="upload-form">
            <div className="form-group">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json"
                required
                aria-label="Select intelligence file"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Brief title (optional)"
                aria-label="Brief title"
              />
            </div>
            <div className="form-group">
              <textarea
                value={uploadMetadata}
                onChange={(e) => setUploadMetadata(e.target.value)}
                placeholder='Metadata JSON (e.g. {"category":"macro"})'
                aria-label="Metadata"
              />
            </div>
            <button type="submit" disabled={uploadMutation.isPending || disableMutations}>
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>

        <div className="rag-section">
          <h3>Search Intelligence</h3>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search briefs (e.g. volatility strategy)"
              aria-label="Search query"
            />
            <button type="submit">Search</button>
          </form>
          <div className="search-results">
            {searchResults.length === 0 ? (
              <p className="muted">No matching briefs yet.</p>
            ) : (
              searchResults.map((result, index) => (
                <article key={`${result.document.id}-${index}`} className="search-result">
                  <header>
                    <h4>{result.document.title ?? 'Untitled brief'}</h4>
                    <span className="score">Relevance {(result.score * 100).toFixed(1)}%</span>
                  </header>
                  <p className="content">{result.document.content.slice(0, 160)}…</p>
                  {result.highlights.length > 0 && (
                    <ul className="highlights">
                      {result.highlights.map((highlight, highlightIndex) => (
                        <li key={highlightIndex}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rag-section">
        <h3>Indexed Intelligence</h3>
        <div className="documents-grid">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className={cn(
                'document-card',
                selectedDocument?.id === doc.id && 'document-card--selected'
              )}
              onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
              onKeyDown={(event) => handleDocumentKeyToggle(event, doc)}
            >
              <header>
                <h4>{doc.title ?? 'Untitled brief'}</h4>
                <span className="badge">{extractMetadata(doc.metadata).category ?? 'general'}</span>
              </header>
              <p>{doc.content.slice(0, 160)}…</p>
              <footer>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteDocument(doc.id).catch((error) =>
                      console.error('Delete failed:', error)
                    )
                  }}
                >
                  Remove
                </button>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <div className="rag-section">
        <button
          type="button"
          onClick={() => {
            handleAddTestData().catch((error) => console.error('Add test data failed:', error))
          }}
          disabled={addTestDataMutation.isPending || disableMutations}
        >
          {addTestDataMutation.isPending ? 'Seeding…' : 'Seed sample data'}
        </button>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card/70 p-4 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold text-primary-foreground">{value}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
