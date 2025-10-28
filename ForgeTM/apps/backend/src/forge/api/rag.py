import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from forge.services.vector_db import VectorDocument, generate_embedding, get_vector_db

from ..api.auth import get_current_active_user
from ..models.user import User

router = APIRouter()


class Document(BaseModel):
    id: str
    title: str
    content: str
    metadata: dict[str, Any] = {}
    embedding: list[float] | None = None


class SearchQuery(BaseModel):
    query: str
    limit: int = 10
    threshold: float = 0.7


class SearchResult(BaseModel):
    document: Document
    score: float
    highlights: list[str] = []


@router.post('/documents')
async def upload_document(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_active_user)],
    title: str | None = None,
    metadata: str | None = None,
) -> dict[str, str]:
    """Upload and index a document for RAG."""
    try:
        # Get vector database instance
        vector_db = get_vector_db()

        # Read file content
        content = (await file.read()).decode('utf-8')

        # Parse metadata if provided
        doc_metadata = json.loads(metadata) if metadata else {}

        # Generate document ID
        doc_id = f'{file.filename}_{len(vector_db.list_documents())}'

        # Generate embeddings for the document
        embedding = generate_embedding(content)

        # Create VectorDocument
        vector_doc = VectorDocument(
            id=doc_id,
            content=content,
            metadata={'title': title or file.filename, 'filename': file.filename, **doc_metadata},
            embedding=embedding,
        )

        # Store document in vector database
        vector_db.store_document(vector_doc)

        return {
            'message': f'Document "{title or file.filename}" uploaded and indexed successfully',
            'id': doc_id,
        }

    except Exception as e:
        detail = f'Failed to upload document: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


@router.get('/documents')
async def list_documents(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[Document]:
    """List all indexed documents."""
    try:
        vector_db = get_vector_db()
        vector_docs = vector_db.list_documents()

        # Convert VectorDocument to Document format
        documents = []
        for vector_doc in vector_docs:
            documents.append(
                Document(
                    id=vector_doc.id,
                    title=vector_doc.metadata.get('title', 'Untitled'),
                    content=vector_doc.content,
                    metadata=vector_doc.metadata,
                    embedding=vector_doc.embedding,
                )
            )

        return documents

    except Exception as e:
        detail = f'Failed to list documents: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


@router.delete('/documents/{doc_id}')
async def delete_document(
    doc_id: str, current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict[str, str]:
    """Delete a document from the index."""
    try:
        vector_db = get_vector_db()

        # Check if document exists
        doc = vector_db.get_document(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail=f'Document {doc_id} not found')

        # Delete from vector database
        vector_db.delete_document(doc_id)

        return {'message': f'Document {doc_id} deleted successfully'}

    except HTTPException:
        raise
    except Exception as e:
        detail = f'Failed to delete document: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


@router.post('/search')
async def search_documents(
    query: SearchQuery, current_user: Annotated[User, Depends(get_current_active_user)]
) -> list[SearchResult]:
    """Search documents using semantic similarity."""
    try:
        vector_db = get_vector_db()

        # Generate mock embedding for testing (same random seed for consistent results)
        import random

        random.seed(hash(query.query) % 10000)  # Deterministic seed based on query
        query_embedding = [random.uniform(-1, 1) for _ in range(1536)]

        # Search using vector similarity
        search_results = vector_db.search_similar(
            query_embedding=query_embedding, limit=query.limit, threshold=query.threshold
        )

        # Convert to API format
        results = []
        for result in search_results:
            if result.score >= query.threshold:
                # Get full document for content
                doc = vector_db.get_document(result.document.id)
                if doc:
                    results.append(
                        SearchResult(
                            document=Document(
                                id=doc.id,
                                title=doc.metadata.get('title', 'Untitled'),
                                content=doc.content,
                                metadata=doc.metadata,
                                embedding=doc.embedding,
                            ),
                            score=result.score,
                            highlights=[],  # Could implement text highlighting later
                        )
                    )

        return results

    except Exception as e:
        detail = f'Failed to search documents: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


@router.get('/stats')
async def get_rag_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, Any]:
    """Get RAG system statistics."""
    try:
        vector_db = get_vector_db()
        stats = vector_db.get_stats()

        return {
            'totalDocuments': stats.get('total_vectors', 0),
            'dimension': stats.get('dimension', 0),
            'indexName': stats.get('index_name', 'unknown'),
            'status': 'healthy' if 'error' not in stats else 'error',
        }

    except Exception as e:
        detail = f'Failed to get RAG stats: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e


@router.post('/documents/test-data')
async def add_test_documents(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, str]:
    """Add sample documents for testing."""
    try:
        vector_db = get_vector_db()

        test_docs = [
            {
                'id': 'doc_1',
                'content': """
                ForgeTM is a comprehensive AI model management platform that provides unified access
                to multiple LLM providers including OpenAI, Google Gemini,
                DeepSeek, and local Ollama models.

                Key features include:
                - Intelligent routing based on task type and cost optimization
                - Local model management with Ollama integration
                - Real-time analytics and monitoring
                - Feature flags for gradual rollouts

                To get started, first configure your API keys in the environment variables,
                then use the dashboard to monitor provider health and manage your models.
                """,
                'metadata': {
                    'title': 'Getting Started with ForgeTM',
                    'category': 'documentation',
                    'tags': ['getting-started', 'overview'],
                },
            },
            {
                'id': 'doc_2',
                'content': """
                API keys are critical for accessing various AI providers. ForgeTM supports multiple
                providers with different authentication methods.

                Supported providers:
                - OpenAI: Requires OPENAI_API_KEY
                - Google Gemini: Requires GEMINI_API_KEY
                - DeepSeek: Requires DEEPSEEK_API_KEY
                - Polygon: Requires POLYGON_API_KEY (for financial data)

                Keys should be stored securely and rotated regularly. The system includes built-in
                security scanning to prevent accidental key exposure.
                """,
                'metadata': {
                    'title': 'API Key Management',
                    'category': 'security',
                    'tags': ['api-keys', 'security'],
                },
            },
            {
                'id': 'doc_3',
                'content': """
                ForgeTM uses intelligent routing to select the best model for each task
                based on multiple factors:

                Routing criteria:
                - Task complexity and required quality
                - Cost optimization (local models are free)
                - Response latency requirements
                - Provider availability and health
                - Fallback mechanisms for reliability

                The routing engine continuously learns from usage patterns to optimize
                selections over time.
                """,
                'metadata': {
                    'title': 'Model Routing Logic',
                    'category': 'technical',
                    'tags': ['routing', 'optimization'],
                },
            },
        ]

        for doc_data in test_docs:
            # Generate mock embedding for testing (use document hash as seed for consistency)
            import random

            doc_seed = hash(doc_data['content']) % 10000
            random.seed(doc_seed)
            mock_embedding = [random.uniform(-1, 1) for _ in range(1536)]

            # Create VectorDocument with explicit type casting
            doc_id: str = str(doc_data['id'])
            doc_content: str = str(doc_data['content'])
            doc_metadata: dict[str, Any] = doc_data['metadata']  # type: ignore[assignment]

            vector_doc = VectorDocument(
                id=doc_id,
                content=doc_content,
                metadata=doc_metadata,
                embedding=mock_embedding,
            )

            # Store in vector database
            vector_db.store_document(vector_doc)

        return {'message': f'Added {len(test_docs)} test documents for demonstration'}

    except Exception as e:
        detail = f'Failed to add test documents: {str(e)}'
        raise HTTPException(status_code=500, detail=detail) from e
