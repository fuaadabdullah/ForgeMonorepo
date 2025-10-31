import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAuthHeaders, getBaseUrl } from '../../lib/controlCenter/api'
import type { Document, RAGStats, SearchQuery, SearchResult } from '../../lib/controlCenter/types'

async function fetchDocuments(): Promise<Document[]> {
  const response = await fetch(`${getBaseUrl()}/rag/documents`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch documents')
  }
  return response.json()
}

async function uploadDocument(formData: FormData): Promise<{ message: string; id: string }> {
  const response = await fetch(`${getBaseUrl()}/rag/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })
  if (!response.ok) {
    throw new Error('Failed to upload document')
  }
  return response.json()
}

async function deleteDocument(docId: string): Promise<{ message: string }> {
  const response = await fetch(`${getBaseUrl()}/rag/documents/${docId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to delete document')
  }
  return response.json()
}

async function searchDocuments(query: SearchQuery): Promise<SearchResult[]> {
  const response = await fetch(`${getBaseUrl()}/rag/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(query),
  })
  if (!response.ok) {
    throw new Error('Failed to search documents')
  }
  return response.json()
}

async function fetchRAGStats(): Promise<RAGStats> {
  const response = await fetch(`${getBaseUrl()}/rag/stats`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch RAG stats')
  }
  return response.json()
}

async function addTestData(): Promise<{ message: string }> {
  const response = await fetch(`${getBaseUrl()}/rag/documents/test-data`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to add test data')
  }
  return response.json()
}

export function useDocuments() {
  return useQuery({
    queryKey: ['rag-documents'],
    queryFn: fetchDocuments,
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}

export function useRAGStats() {
  return useQuery({
    queryKey: ['rag-stats'],
    queryFn: fetchRAGStats,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] })
      queryClient.invalidateQueries({ queryKey: ['rag-stats'] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] })
      queryClient.invalidateQueries({ queryKey: ['rag-stats'] })
    },
  })
}

export function useSearchDocuments() {
  return useMutation({
    mutationFn: searchDocuments,
  })
}

export function useAddTestData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTestData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] })
      queryClient.invalidateQueries({ queryKey: ['rag-stats'] })
    },
  })
}
