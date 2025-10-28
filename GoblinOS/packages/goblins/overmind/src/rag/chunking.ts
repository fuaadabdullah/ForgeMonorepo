/**
 * Document Chunking - Text Splitting for RAG
 *
 * Splits long documents into smaller chunks for embedding:
 * - Recursive character splitting (preserves structure)
 * - Sentence-based splitting (semantic boundaries)
 * - Overlap to maintain context
 * - Metadata preservation
 *
 * @module rag/chunking
 */

/**
 * Chunk with metadata
 */
export interface Chunk {
  id: string
  content: string
  metadata: {
    sourceId: string
    chunkIndex: number
    totalChunks: number
    startChar: number
    endChar: number
    [key: string]: unknown
  }
}

/**
 * Chunking configuration
 */
export interface ChunkingConfig {
  chunkSize?: number // Target chunk size in characters (default: 500)
  chunkOverlap?: number // Overlap between chunks in characters (default: 50)
  separator?: string // Separator for splitting (default: '\n\n')
  keepSeparator?: boolean // Keep separator in chunks (default: true)
}

/**
 * Split text into chunks with overlap
 *
 * @param text - Text to chunk
 * @param config - Chunking configuration
 * @param sourceId - Source document ID
 * @returns Array of chunks
 */
export function chunkText(
  text: string,
  config: ChunkingConfig = {},
  sourceId = 'unknown'
): Chunk[] {
  const chunkSize = config.chunkSize || 500
  const chunkOverlap = config.chunkOverlap || 50
  const separator = config.separator || '\n\n'
  const keepSeparator = config.keepSeparator ?? true

  // Split by separator
  const splits = text.split(separator)
  const chunks: Chunk[] = []
  let currentChunk = ''
  let currentStartChar = 0

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i]
    const piece = keepSeparator && i < splits.length - 1 ? split + separator : split

    // If adding this piece would exceed chunk size
    if (currentChunk.length + piece.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${sourceId}-chunk-${chunks.length}`,
        content: currentChunk.trim(),
        metadata: {
          sourceId,
          chunkIndex: chunks.length,
          totalChunks: -1, // Will update later
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      })

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap)
      currentChunk = currentChunk.slice(overlapStart) + piece
      currentStartChar += overlapStart
    } else {
      currentChunk += piece
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${sourceId}-chunk-${chunks.length}`,
      content: currentChunk.trim(),
      metadata: {
        sourceId,
        chunkIndex: chunks.length,
        totalChunks: -1,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    })
  }

  // Update totalChunks in metadata
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length
  }

  return chunks
}

/**
 * Split text by sentences (using simple sentence detection)
 *
 * Better for preserving semantic boundaries
 *
 * @param text - Text to chunk
 * @param config - Chunking configuration
 * @param sourceId - Source document ID
 * @returns Array of chunks
 */
export function chunkBySentence(
  text: string,
  config: ChunkingConfig = {},
  sourceId = 'unknown'
): Chunk[] {
  const chunkSize = config.chunkSize || 500
  const chunkOverlap = config.chunkOverlap || 50

  // Simple sentence splitting (improve with proper NLP library in production)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  const chunks: Chunk[] = []
  let currentChunk = ''
  let currentStartChar = 0

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${sourceId}-chunk-${chunks.length}`,
        content: currentChunk.trim(),
        metadata: {
          sourceId,
          chunkIndex: chunks.length,
          totalChunks: -1,
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      })

      // Start new chunk with overlap
      const words = currentChunk.trim().split(/\s+/)
      const overlapWords = words.slice(-Math.ceil(chunkOverlap / 5)) // ~5 chars per word
      const overlap = overlapWords.join(' ')

      currentChunk = `${overlap} ${sentence}`
      currentStartChar += currentChunk.length - overlap.length - sentence.length
    } else {
      currentChunk += sentence
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${sourceId}-chunk-${chunks.length}`,
      content: currentChunk.trim(),
      metadata: {
        sourceId,
        chunkIndex: chunks.length,
        totalChunks: -1,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    })
  }

  // Update totalChunks
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length
  }

  return chunks
}

/**
 * Chunk markdown document (preserves headers)
 *
 * @param markdown - Markdown text
 * @param config - Chunking configuration
 * @param sourceId - Source document ID
 * @returns Array of chunks with header metadata
 */
export function chunkMarkdown(
  markdown: string,
  config: ChunkingConfig = {},
  sourceId = 'unknown'
): Chunk[] {
  const chunkSize = config.chunkSize || 500

  // Split by headers
  const sections = markdown.split(/^(#{1,6}\s+.+)$/gm)
  const chunks: Chunk[] = []
  let currentHeader = ''
  let currentContent = ''
  let currentStartChar = 0

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    // Check if this is a header
    if (section.match(/^#{1,6}\s+/)) {
      // Save previous section if not empty
      if (currentContent.trim().length > 0) {
        const content = `${currentHeader}\n\n${currentContent}`.trim()
        chunks.push({
          id: `${sourceId}-chunk-${chunks.length}`,
          content,
          metadata: {
            sourceId,
            chunkIndex: chunks.length,
            totalChunks: -1,
            startChar: currentStartChar,
            endChar: currentStartChar + content.length,
            header: currentHeader.trim(),
          },
        })
        currentStartChar += content.length
      }

      currentHeader = section
      currentContent = ''
    } else {
      currentContent += section

      // If content is too large, chunk it
      if (currentContent.length > chunkSize) {
        const subChunks = chunkText(currentContent, { ...config, chunkSize }, sourceId)

        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            id: `${sourceId}-chunk-${chunks.length}`,
            metadata: {
              ...subChunk.metadata,
              header: currentHeader.trim(),
            },
          })
        }

        currentContent = ''
      }
    }
  }

  // Add final section
  if (currentContent.trim().length > 0) {
    const content = `${currentHeader}\n\n${currentContent}`.trim()
    chunks.push({
      id: `${sourceId}-chunk-${chunks.length}`,
      content,
      metadata: {
        sourceId,
        chunkIndex: chunks.length,
        totalChunks: -1,
        startChar: currentStartChar,
        endChar: currentStartChar + content.length,
        header: currentHeader.trim(),
      },
    })
  }

  // Update totalChunks
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length
  }

  return chunks
}
