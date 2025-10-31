from datetime import datetime
from typing import cast, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..api.auth import get_current_active_user
from ..database import get_db
from ..models.jobs import Job as JobModel, Run as RunModel
from ..models.user import User
from ..jobs.service import engine_and_session
import json
import time

router = APIRouter()


class RunResponse(BaseModel):
    id: str
    started_at: datetime
    status: str
    logs: list[str]


class RunCreate(BaseModel):
    job_id: str


class JobCreate(BaseModel):
    name: str
    guild: str | None = None
    template: str | None = None


class JobResponse(BaseModel):
    id: str
    name: str
    guild: str | None = None
    template: str | None = None
    created_at: datetime
    runs: list[RunResponse] = []


@router.get('/jobs', response_model=list[JobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[JobResponse]:
    """List all jobs for the current user."""
    jobs = db.query(JobModel).all()
    results: list[JobResponse] = []
    for job in jobs:
        runs: list[RunResponse] = []
        for run in getattr(job, 'runs', []) or []:
            runs.append(
                RunResponse(
                    id=cast(str, run.id),
                    started_at=cast(datetime, run.started_at),
                    status=cast(str, run.status),
                    logs=run.logs.split('\n') if getattr(run, 'logs', None) else [],
                )
            )
        results.append(
            JobResponse(
                id=cast(str, job.id),
                name=cast(str, job.name),
                guild=cast(str | None, getattr(job, 'guild', None)),
                template=cast(str | None, getattr(job, 'template', None)),
                created_at=cast(datetime, getattr(job, 'created_at', datetime.utcnow())),
                runs=runs,
            )
        )
    return results


@router.post('/jobs', response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Create a new job."""
    job = JobModel(
        id=f"job_{datetime.utcnow().timestamp()}_{hash(job_data.name) % 1000}",
        name=job_data.name,
        guild=job_data.guild,
        template=job_data.template,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobResponse(
        id=cast(str, job.id),
        name=cast(str, job.name),
        guild=cast(str | None, getattr(job, 'guild', None)),
        template=cast(str | None, getattr(job, 'template', None)),
        created_at=cast(datetime, getattr(job, 'created_at', datetime.utcnow())),
        runs=[],
    )


@router.get('/jobs/{job_id}', response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Get a specific job."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    runs: list[RunResponse] = []
    for run in getattr(job, 'runs', []) or []:
        runs.append(
            RunResponse(
                id=cast(str, run.id),
                started_at=cast(datetime, run.started_at),
                status=cast(str, run.status),
                logs=run.logs.split('\n') if getattr(run, 'logs', None) else [],
            )
        )

    return JobResponse(
        id=cast(str, job.id),
        name=cast(str, job.name),
        guild=cast(str | None, getattr(job, 'guild', None)),
        template=cast(str | None, getattr(job, 'template', None)),
        created_at=cast(datetime, getattr(job, 'created_at', datetime.utcnow())),
        runs=runs,
    )


@router.post('/jobs/{job_id}/runs', response_model=RunResponse)
async def create_run(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RunResponse:
    """Create a new run for a job."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    run = RunModel(
        id=f"run_{datetime.utcnow().timestamp()}_{hash(job_id) % 1000}",
        job_id=job_id,
        status='running',
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return RunResponse(
        id=cast(str, run.id),
        started_at=cast(datetime, run.started_at),
        status=cast(str, run.status),
        logs=[],
    )


@router.post('/jobs/{job_id}/runs/{run_id}/logs')
async def add_log(
    job_id: str,
    run_id: str,
    log_line: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Add a log line to a run."""
    run = (
        db.query(RunModel)
        .filter(RunModel.id == run_id, RunModel.job_id == job_id)
        .first()
    )
    # runtime ORM objects are not well-typed for mypy (attributes often
    # appear as Column[...] types). Cast to Any to allow runtime assignment
    # to ORM attributes (e.g. updating run.logs).
    run_obj = cast(Any, run)
    if not run_obj:
        raise HTTPException(status_code=404, detail='Run not found')

    current_logs = getattr(run_obj, 'logs', '') or ''
    run_obj.logs = current_logs + ('\n' if current_logs else '') + log_line
    db.commit()
    return {'message': 'Log added'}


@router.get('/jobs/last-failed-run')
async def get_last_failed_run(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
 ) -> dict | None:
    """Get the last failed run."""
    run = (
        db.query(RunModel)
        .filter(RunModel.status == 'failed')
        .order_by(RunModel.started_at.desc())
        .first()
    )

    if not run:
        return None

    job = db.query(JobModel).filter(JobModel.id == run.job_id).first()
    if not job:
        return None

    return {
        'job': {
            'id': job.id,
            'name': job.name,
            'guild': job.guild,
            'template': job.template,
            'created_at': job.created_at,
        },
        'run': {
            'id': cast(str, run.id),
            'started_at': cast(datetime, run.started_at),
            'status': cast(str, run.status),
            'logs': run.logs.split('\n') if getattr(run, 'logs', None) else [],
        },
    }


class EnqueueRequest(BaseModel):
    type: str
    payload: dict | None = None
    priority: int | None = 0


@router.post('/jobs/enqueue')
async def enqueue_job(
    req: EnqueueRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Enqueue a job into the durable goblin DB (Application Support goblin.db)."""
    engine, Session = engine_and_session()
    job_id = f"job_{int(time.time())}_{hash(req.type) % 1000}"
    with Session() as s:
        s.execute(
            "INSERT INTO job (id, type, payload, created_at, priority, state) VALUES (:id, :type, :payload, :created_at, :priority, 'queued')",
            {
                "id": job_id,
                "type": req.type,
                "payload": json.dumps(req.payload or {}),
                "created_at": int(time.time()),
                "priority": req.priority or 0,
            },
        )
        s.commit()
    return {"id": job_id, "status": "queued"}
