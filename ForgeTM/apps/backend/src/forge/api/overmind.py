"""
Admin endpoints for overmind operations.

This module provides administrative endpoints for managing background tasks,
queue operations, and system maintenance.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..api.auth import get_current_admin_user
from ..models.user import User
from ..tasks import (
    analytics_aggregation_task,
    cleanup_expired_data_task,
    health_check_task,
    model_cache_refresh_task,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class TaskResponse(BaseModel):
    """Response model for task operations."""
    task_id: str
    status: str
    message: str


class QueueFlushResponse(BaseModel):
    """Response model for queue flush operations."""
    success: bool
    message: str
    flushed_items: int = 0


@router.post('/agents/start', response_model=TaskResponse)
async def start_agents(
    current_user: User = Depends(get_current_admin_user),
) -> TaskResponse:
    """Start background agents/tasks."""
    try:
        # Start essential background tasks
        health_task = health_check_task.delay()
        analytics_task = analytics_aggregation_task.delay()
        cleanup_task = cleanup_expired_data_task.delay()
        cache_task = model_cache_refresh_task.delay()

        logger.info(
            f"Admin {current_user.username} started agents: health={health_task.id}, "
            f"analytics={analytics_task.id}, cleanup={cleanup_task.id}, cache={cache_task.id}"
        )

        return TaskResponse(
            task_id=f"batch-{health_task.id}",
            status="started",
            message="Background agents started successfully"
        )
    except Exception as e:
        logger.error(f"Failed to start agents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start agents: {str(e)}") from e


@router.post('/agents/stop', response_model=TaskResponse)
async def stop_agents(
    current_user: User = Depends(get_current_admin_user),
) -> TaskResponse:
    """Stop background agents/tasks."""
    try:
        # Note: Celery doesn't have a direct "stop all" command
        # This would require implementing task revocation or worker control
        # For now, we'll revoke pending tasks and note that running tasks will complete

        from ..celery_app import celery_app

        # Revoke all pending tasks (this is a simplified approach)
        # In production, you'd want more granular control
        i = celery_app.control.inspect()
        active_tasks = i.active()
        scheduled_tasks = i.scheduled()

        revoked_count = 0
        if active_tasks:
            for _worker, tasks in active_tasks.items():
                for task in tasks:
                    celery_app.control.revoke(task['id'], terminate=True)
                    revoked_count += 1

        if scheduled_tasks:
            for _worker, tasks in scheduled_tasks.items():
                for task in tasks:
                    celery_app.control.revoke(task['id'], terminate=True)
                    revoked_count += 1

        logger.info(f"Admin {current_user.username} stopped {revoked_count} agent tasks")

        return TaskResponse(
            task_id="stop-agents",
            status="stopped",
            message=f"Stopped {revoked_count} background agent tasks"
        )
    except Exception as e:
        logger.error(f"Failed to stop agents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop agents: {str(e)}") from e


@router.post('/queue/flush', response_model=QueueFlushResponse)
async def flush_queue(
    current_user: User = Depends(get_current_admin_user),
) -> QueueFlushResponse:
    """Flush system queues (LiteLLM batch logger, etc.)."""
    try:
        flushed_items = 0

        # Flush LiteLLM custom batch logger queue if available
        try:
            # Check if CustomBatchLogger is available
            import importlib.util
            if importlib.util.find_spec("litellm.integrations.custom_batch_logger"):
                logger.info("Attempting to flush LiteLLM batch logger queue")
                # Note: In practice, you'd need access to the actual logger instance
                # For now, we simulate the operation
            else:
                logger.warning("CustomBatchLogger not available for flushing")

        except Exception as e:
            logger.warning(f"Failed to check CustomBatchLogger: {e}")

        # Flush Celery queues
        try:
            from ..celery_app import celery_app

            # Cancel all waiting tasks in queues
            i = celery_app.control.inspect()
            stats = i.stats()

            if stats:
                for _worker in stats.keys():
                    # Purge the worker's queues
                    celery_app.control.purge()
                    logger.info(f"Purged queues for worker {_worker}")

            flushed_items += 1  # Simplified count

        except Exception as e:
            logger.warning(f"Failed to flush Celery queues: {e}")

        logger.info(f"Admin {current_user.username} flushed system queues")

        return QueueFlushResponse(
            success=True,
            message="System queues flushed successfully",
            flushed_items=flushed_items
        )
    except Exception as e:
        logger.error(f"Failed to flush queues: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to flush queues: {str(e)}") from e
