import logging
from typing import Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class MonitoringService:
    """Basic monitoring and alerting service for guild KPIs and router audit."""

    def __init__(self) -> None:
        self.alerts: list[dict[str, Any]] = []
        self.kpi_thresholds: dict[str, dict[str, dict[str, float]]] = {
            "forge": {
                "buildTime": {"warning": 1500, "critical": 2000},
                "performance": {"warning": 85, "critical": 75},
            },
            "crafters": {
                "cls": {"warning": 0.15, "critical": 0.25},
                "accessibility": {"warning": 85, "critical": 75},
            },
            "keepers": {
                "securityScore": {"warning": 80, "critical": 70},
                "compliance": {"warning": 90, "critical": 80},
            },
            "huntress": {
                "testCoverage": {"warning": 80, "critical": 70},
                "flakyRate": {"warning": 5.0, "critical": 10.0},
            },
            "mages": {
                "qualityScore": {"warning": 85, "critical": 75},
                "gateCompliance": {"warning": 90, "critical": 80},
            },
        }

    def check_kpi_violations(self, guild: str, metrics: dict[str, Any]) -> list[dict[str, Any]]:
        """Check if current metrics violate established KPI thresholds.

        Returns a list of violation alerts.
        """
        violations: list[dict[str, Any]] = []

        if guild not in self.kpi_thresholds:
            logger.warning("No KPI thresholds defined for guild: %s", guild)
            return violations

        thresholds = self.kpi_thresholds[guild]

        for metric_name, value in metrics.items():
            if metric_name not in thresholds:
                continue

            threshold = thresholds[metric_name]
            violation_level: str | None = None

            if value >= threshold.get("critical", float("inf")):
                violation_level = "critical"
            elif value >= threshold.get("warning", float("inf")):
                violation_level = "warning"

            if violation_level:
                alert: dict[str, Any] = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "guild": guild,
                    "metric": metric_name,
                    "value": value,
                    "threshold": threshold,
                    "level": violation_level,
                    "message": f"{guild} guild {metric_name} is {violation_level}: {value}",
                }
                violations.append(alert)
                self.alerts.append(alert)
                logger.warning("🚨 KPI Violation Alert: %s", alert["message"])

        return violations

    def check_router_escalations(self, audit_log: dict[str, Any]) -> list[dict[str, Any]]:
        """Check router audit logs for escalation patterns and policy violations."""
        alerts: list[dict[str, Any]] = []

        session_id = audit_log.get("sessionId")
        if session_id:
            recent_escalations = [
                log
                for log in self.alerts[-50:]
                if log.get("type") == "escalation" and log.get("sessionId") == session_id
            ]

            if len(recent_escalations) >= 3:
                alert = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "escalation",
                    "sessionId": session_id,
                    "guild": audit_log.get("guild"),
                    "level": "warning",
                    "message": f"Multiple escalations detected in session {session_id}",
                }
                alerts.append(alert)
                self.alerts.append(alert)
                logger.warning("🚨 Escalation Alert: %s", alert["message"])

        if not audit_log.get("success", True):
            alert = {
                "timestamp": datetime.utcnow().isoformat(),
                "type": "policy_violation",
                "guild": audit_log.get("guild"),
                "task": audit_log.get("task"),
                "level": "warning",
                "message": (
                    f"Policy violation in {audit_log.get('guild')} guild: "
                    f"{audit_log.get('error', 'Unknown error')}"
                ),
            }
            alerts.append(alert)
            self.alerts.append(alert)
            logger.warning("🚨 Policy Violation Alert: %s", alert["message"])

        return alerts

    def get_recent_alerts(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent alerts, sorted by timestamp (newest first)."""
        return sorted(self.alerts[-limit:], key=lambda x: x.get("timestamp", ""), reverse=True)

    def get_alerts_by_guild(self, guild: str) -> list[dict[str, Any]]:
        """Get all alerts for a specific guild."""
        return [alert for alert in self.alerts if alert.get("guild") == guild]

    def get_alerts_by_level(self, level: str) -> list[dict[str, Any]]:
        """Get all alerts of a specific severity level."""
        return [alert for alert in self.alerts if alert.get("level") == level]

    def clear_old_alerts(self, days: int = 7) -> None:
        """Clear alerts older than specified days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        self.alerts = [alert for alert in self.alerts if datetime.fromisoformat(alert["timestamp"]) > cutoff]


# Global monitoring service instance
monitoring_service = MonitoringService()
