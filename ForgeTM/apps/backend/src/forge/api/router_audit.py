from datetime import datetime
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..observability.monitoring import monitoring_service

router = APIRouter()


class RouterAuditLog(BaseModel):
    sessionId: str = Field(..., description="Unique session identifier")
    guild: str = Field(..., description="Guild that handled the routing decision")
    task: str = Field(..., description="Task or operation being performed")
    liteBrain: str = Field(..., description="LiteBrain model used for routing")
    routingReason: str = Field(..., description="Reason for the routing decision")
    timestamp: str = Field(..., description="ISO timestamp of the audit log")
    escalationTrigger: str | None = Field(None, description="What triggered escalation if any")
    fallbackChain: list[str] | None = Field(None, description="Fallback chain of models")
    kpi: dict | None = Field(None, description="Guild-specific KPI metrics")
    success: bool = Field(..., description="Whether the routing was successful")
    error: str | None = Field(None, description="Error message if routing failed")


class GuildKPIMetrics(BaseModel):
    current: dict = Field(..., description="Current KPI values")
    targets: dict = Field(..., description="Target KPI values")
    trends: list[dict] = Field(..., description="Historical KPI trends")


# In-memory storage for development (in production, use a proper database)
audit_logs: list[RouterAuditLog] = []
guild_kpi_data: dict[str, Any] = {
    "forge": {
        "current": {"buildTime": 1250, "performance": 95},
        "targets": {"buildTime": 1000, "performance": 98},
        "trends": [
            {"timestamp": "2025-10-29T10:00:00Z", "metrics": {"buildTime": 1200, "performance": 94}},
            {"timestamp": "2025-10-29T11:00:00Z", "metrics": {"buildTime": 1250, "performance": 95}},
        ],
    },
}


@router.post("/router-audit", response_model=dict)
async def log_router_audit(log: RouterAuditLog) -> dict:
    """Log a router audit entry to goblinos.overmind.router-audit."""
    try:
        audit_logs.append(log)

        if log.kpi:
            violations = monitoring_service.check_kpi_violations(log.guild, log.kpi)
            if violations:
                print(f"🚨 Detected {len(violations)} KPI violations for {log.guild} guild")

        escalation_alerts = monitoring_service.check_router_escalations(log.model_dump())
        if escalation_alerts:
            print(f"🚨 Detected {len(escalation_alerts)} escalation alerts")

        print(f"🔄 Router Audit: {log.guild} | {log.task} | {log.liteBrain} | Success: {log.success}")
        return {"success": True, "message": "Router audit logged successfully"}

    except Exception as e:
        print(f"❌ Failed to log router audit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to log router audit: {str(e)}")


@router.get("/router-audit", response_model=list[RouterAuditLog])
async def get_router_audit_logs(
    guild: str | None = Query(None, description="Filter by guild"),
    limit: int = Query(50, description="Maximum number of logs to return", ge=1, le=1000),
    success: bool | None = Query(None, description="Filter by success status"),
) -> list[RouterAuditLog]:
    """Retrieve router audit logs with optional filtering."""
    try:
        filtered_logs = audit_logs

        if guild:
            filtered_logs = [log for log in filtered_logs if log.guild == guild]

        if success is not None:
            filtered_logs = [log for log in filtered_logs if log.success == success]

        # timestamp is stored as ISO string in this in-memory example
        filtered_logs.sort(key=lambda x: x.timestamp, reverse=True)
        return filtered_logs[:limit]

    except Exception as e:
        print(f"❌ Failed to retrieve router audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit logs: {str(e)}")


@router.get("/guild-kpi/{guild}", response_model=GuildKPIMetrics)
async def get_guild_kpi_metrics(guild: str) -> GuildKPIMetrics:
    """Retrieve KPI metrics for a specific guild."""
    try:
        if guild not in guild_kpi_data:
            raise HTTPException(status_code=404, detail=f"Guild '{guild}' not found")

        return GuildKPIMetrics(**guild_kpi_data[guild])

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Failed to retrieve KPI metrics for guild {guild}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve KPI metrics: {str(e)}")


@router.get("/guild-kpi", response_model=dict)
async def get_all_guild_kpi_metrics() -> dict:
    """Retrieve KPI metrics for all guilds."""
    try:
        return guild_kpi_data

    except Exception as e:
        print(f"❌ Failed to retrieve all guild KPI metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve KPI metrics: {str(e)}")


@router.get("/monitoring/alerts", response_model=list[dict])
async def get_monitoring_alerts(
    guild: str | None = Query(None, description="Filter by guild"),
    level: str | None = Query(None, description="Filter by alert level (warning, critical)"),
    limit: int = Query(50, description="Maximum number of alerts to return", ge=1, le=500),
) -> list[dict]:
    """Retrieve monitoring alerts with optional filtering."""
    try:
        alerts = monitoring_service.get_recent_alerts(limit * 2)  # Get more to filter

        if guild:
            alerts = [alert for alert in alerts if alert.get("guild") == guild]

        if level:
            alerts = [alert for alert in alerts if alert.get("level") == level]

        return alerts[:limit]

    except Exception as e:
        print(f"❌ Failed to retrieve monitoring alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")
