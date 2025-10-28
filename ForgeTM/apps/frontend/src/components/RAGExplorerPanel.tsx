import { FormEvent, useRef, useState } from 'react';
import {
    useAddTestData,
    useDeleteDocument,
    useDocuments,
    useRAGStats,
    useSearchDocuments,
    useUploadDocument,
} from '../hooks/useRAGExplorer';
import { Document, SearchResult } from '../lib/types';

export function RAGExplorerPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadMetadata, setUploadMetadata] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsQuery = useDocuments();
  const statsQuery = useRAGStats();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const searchMutation = useSearchDocuments();
  const addTestDataMutation = useAddTestData();

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const results = await searchMutation.mutateAsync({
        query: searchQuery,
        limit: 10,
        threshold: 0.5,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (uploadTitle.trim()) {
      formData.append('title', uploadTitle.trim());
    }
    if (uploadMetadata.trim()) {
      formData.append('metadata', uploadMetadata.trim());
    }

    try {
      await uploadMutation.mutateAsync(formData);
      setUploadTitle('');
      setUploadMetadata('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteMutation.mutateAsync(docId);
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleAddTestData = async () => {
    try {
      await addTestDataMutation.mutateAsync();
    } catch (error) {
      console.error('Adding test data failed:', error);
    }
  };

  return (
    <div className="panel">
      <h2>RAG Explorer</h2>
      <p>Upload documents, build a knowledge base, and perform semantic search.</p>

      {/* Stats Section */}
      {statsQuery.data && (
        <div className="rag-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{statsQuery.data.totalDocuments}</div>
              <div className="stat-label">Documents</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statsQuery.data.totalTokens.toLocaleString()}</div>
              <div className="stat-label">Total Tokens</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statsQuery.data.averageDocumentLength}</div>
              <div className="stat-label">Avg Length</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statsQuery.data.indexSize}</div>
              <div className="stat-label">Index Size</div>
            </div>
          </div>
        </div>
      )}

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
              disabled={uploadMutation.isPending}
              className="btn-primary"
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload Document'}
            </button>
          </form>

          <div className="test-data-section">
            <button
              onClick={handleAddTestData}
              disabled={addTestDataMutation.isPending}
              className="btn-secondary"
            >
              {addTestDataMutation.isPending ? 'Adding…' : 'Add Sample Documents'}
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
                disabled={searchMutation.isPending || !searchQuery.trim()}
                className="btn-primary"
              >
                {searchMutation.isPending ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Search Results ({searchResults.length})</h4>
              <div className="results-list">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="result-item"
                    onClick={() => setSelectedDocument(result.document)}
                  >
                    <div className="result-header">
                      <h5>{result.document.title}</h5>
                      <span className="result-score">Score: {(result.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="result-highlights">
                      {result.highlights.slice(0, 2).map((highlight, hIndex) => (
                        <div key={hIndex} className="highlight" dangerouslySetInnerHTML={{
                          __html: highlight.replace(
                            new RegExp(searchQuery, 'gi'),
                            (match) => `<mark>${match}</mark>`
                          )
                        }} />
                      ))}
                    </div>
                    {result.document.metadata?.category && (
                      <div className="result-meta">
                        <span className="category">{result.document.metadata.category}</span>
                        {result.document.metadata.tags && (
                          <div className="tags">
                            {result.document.metadata.tags.map((tag: string, tIndex: number) => (
                              <span key={tIndex} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="rag-section">
          <h3>Knowledge Base ({documentsQuery.data?.length || 0} documents)</h3>
          {documentsQuery.isLoading ? (
            <p><span className="loader" /> Loading documents…</p>
          ) : documentsQuery.isError ? (
            <div className="empty-state">
              <p>Failed to load documents.</p>
              <button onClick={() => documentsQuery.refetch()}>Retry</button>
            </div>
          ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
            <div className="documents-list">
              {documentsQuery.data.map((doc) => (
                <div
                  key={doc.id}
                  className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="document-header">
                    <h4>{doc.title}</h4>
                    <div className="document-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                        }}
                        className="btn-secondary btn-small"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="btn-danger btn-small"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="document-meta">
                    <span>{doc.content.length} characters</span>
                    {doc.metadata?.category && (
                      <span className="category">{doc.metadata.category}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No documents in the knowledge base yet.</p>
              <p>Upload some documents or add sample data to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
  );
}
