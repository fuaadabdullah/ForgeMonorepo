"""
Vector database service for RAG operations.

This module provides a unified interface for vector database operations,
currently implemented with Pinecone but designed to be easily extensible
to other vector databases like Weaviate, Qdrant, etc.
"""

import os
from typing import Any

import pinecone  # type: ignore
from pydantic import BaseModel


class VectorDocument(BaseModel):
    """Document representation for vector storage."""

    id: str
    content: str
    metadata: dict[str, Any] = {}
    embedding: list[float] | None = None


class SearchResult(BaseModel):
    """Search result with similarity score."""

    document: VectorDocument
    score: float
    metadata: dict[str, Any] = {}


class VectorDatabase:
    """Vector database service using Pinecone."""

    def __init__(self) -> None:
        self.api_key = os.getenv('PINECONE_API_KEY')
        self.environment = os.getenv('PINECONE_ENVIRONMENT', 'us-east-1')
        self.index_name = os.getenv('PINECONE_INDEX_NAME', 'forgetm-rag')
        self.dimension = int(os.getenv('PINECONE_DIMENSION', '1536'))
        # OpenAI text-embedding-ada-002 dimension

        if not self.api_key:
            raise ValueError('PINECONE_API_KEY environment variable is required')

        # Initialize Pinecone client with new API
        from pinecone import Pinecone, ServerlessSpec

        self.pc = Pinecone(api_key=self.api_key)

        # Create index if it doesn't exist
        if self.index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric='cosine',
                spec=ServerlessSpec(cloud='aws', region=self.environment),
            )

        self.index = self.pc.Index(self.index_name)

    def store_document(self, document: VectorDocument) -> str:
        """Store a document with its embedding."""
        if not document.embedding:
            raise ValueError('Document must have an embedding')

        # Prepare data for Pinecone
        vector_data = {
            'id': document.id,
            'values': document.embedding,
            'metadata': {'content': document.content, **document.metadata},
        }

        # Upsert to Pinecone
        self.index.upsert(vectors=[vector_data])

        return document.id

    def search_similar(
        self,
        query_embedding: list[float],
        limit: int = 10,
        threshold: float = 0.7,
        filter_metadata: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Search for similar documents using vector similarity."""
        # Query Pinecone
        query_response = self.index.query(
            vector=query_embedding, top_k=limit, include_metadata=True, filter=filter_metadata
        )

        results = []
        for match in query_response.matches:
            if match.score >= threshold:
                # Reconstruct document from metadata
                metadata = match.metadata or {}
                content = metadata.pop('content', '')

                document = VectorDocument(
                    id=match.id, content=content, metadata=metadata, embedding=match.values
                )

                results.append(
                    SearchResult(
                        document=document, score=match.score, metadata={'match_id': match.id}
                    )
                )

        return results

    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the vector database."""
        try:
            self.index.delete(ids=[document_id])
            return True
        except Exception:
            return False

    def get_document(self, document_id: str) -> VectorDocument | None:
        """Retrieve a specific document by ID."""
        try:
            response = self.index.fetch(ids=[document_id])
            if document_id in response.vectors:
                vector_data = response.vectors[document_id]
                metadata = vector_data.metadata or {}
                content = metadata.pop('content', '')

                return VectorDocument(
                    id=document_id, content=content, metadata=metadata, embedding=vector_data.values
                )
        except Exception:
            pass
        return None

    def list_documents(self, limit: int = 100) -> list[VectorDocument]:
        """List all documents in the database."""
        try:
            # Pinecone doesn't have a direct list operation, so we'll use a dummy query
            # to get some vectors, but this is not ideal for large datasets
            response = self.index.query(
                vector=[0.0] * self.dimension,  # Dummy vector
                top_k=limit,
                include_metadata=True,
            )

            documents = []
            for match in response.matches:
                metadata = match.metadata or {}
                content = metadata.pop('content', '')

                documents.append(
                    VectorDocument(
                        id=match.id, content=content, metadata=metadata, embedding=match.values
                    )
                )

            return documents
        except Exception:
            return []

    def get_stats(self) -> dict[str, int | str]:
        """Get database statistics."""
        try:
            stats = self.index.describe_index_stats()
            return {
                'total_vectors': stats.total_vector_count,
                'dimension': self.dimension,
                'index_name': self.index_name,
            }
        except Exception:
            return {
                'total_vectors': 0,
                'dimension': self.dimension,
                'index_name': self.index_name,
                'error': 'Failed to get stats',
            }

    def clear_all(self) -> bool:
        """Clear all documents from the database (use with caution)."""
        try:
            # Get all vector IDs (this is a workaround since Pinecone doesn't have a direct clear)
            response = self.index.query(
                vector=[0.0] * self.dimension,
                top_k=10000,  # Adjust based on your needs
                include_values=False,
            )

            if response.matches:
                ids_to_delete = [match.id for match in response.matches]
                self.index.delete(ids=ids_to_delete)

            return True
        except Exception:
            return False


# Global instance
_vector_db: VectorDatabase | None = None


def get_vector_db() -> VectorDatabase:
    """Get or create the global vector database instance."""
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDatabase()
    return _vector_db


def generate_embedding(text: str) -> list[float]:
    """
    Generate embeddings for text using OpenAI.

    In production, you might want to use a local embedding model or
    a different provider for better performance/cost.
    """
    import openai

    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    response = client.embeddings.create(input=text, model='text-embedding-ada-002')

    return response.data[0].embedding
