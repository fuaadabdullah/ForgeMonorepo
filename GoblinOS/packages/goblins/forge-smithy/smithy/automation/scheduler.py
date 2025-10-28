"""
Advanced scheduling engine for automation.

Provides cron-like scheduling, timezone support, calendar integration,
and flexible scheduling patterns for automated workflows.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ScheduleEvent:
    """Represents a scheduled event."""

    schedule_name: str
    next_run: datetime
    last_run: Optional[datetime]
    data: Dict[str, Any]


class Schedule(ABC):
    """Abstract base class for all schedule types."""

    def __init__(self, name: str, timezone: Optional[str] = None):
        self.name = name
        self.timezone = timezone or "UTC"
        self._tz = self._parse_timezone(timezone)

    def _parse_timezone(self, tz_str: Optional[str]) -> timezone:
        """Parse timezone string to timezone object."""
        if not tz_str or tz_str.upper() == "UTC":
            return timezone.utc

        # TODO: Add full timezone support with zoneinfo/pytz
        logger.warning(f"Timezone '{tz_str}' not supported yet, using UTC")
        return timezone.utc

    @abstractmethod
    def get_next_run(self, after: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next scheduled run time after the given time."""
        pass

    def is_due(self, current_time: Optional[datetime] = None) -> bool:
        """Check if the schedule is due to run."""
        if current_time is None:
            current_time = datetime.now(self._tz)

        next_run = self.get_next_run(current_time)
        if next_run is None:
            return False

        # Consider it due if within 1 minute of scheduled time
        return abs((next_run - current_time).total_seconds()) < 60


class CronSchedule(Schedule):
    """Cron-like schedule with flexible patterns."""

    def __init__(self, name: str, cron_expression: str, timezone: Optional[str] = None):
        super().__init__(name, timezone)
        self.cron_expression = cron_expression
        self._parsed = self._parse_cron(cron_expression)

    def _parse_cron(self, expression: str) -> Dict[str, List[int]]:
        """Parse cron expression into components."""
        parts = expression.split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {expression}")

        minute, hour, day, month, day_of_week = parts

        return {
            "minute": self._parse_field(minute, 0, 59),
            "hour": self._parse_field(hour, 0, 23),
            "day": self._parse_field(day, 1, 31),
            "month": self._parse_field(month, 1, 12),
            "day_of_week": self._parse_field(day_of_week, 0, 6),  # 0=Sunday
        }

    def _parse_field(self, field: str, min_val: int, max_val: int) -> List[int]:
        """Parse a cron field (minute, hour, etc.)."""
        if field == "*":
            return list(range(min_val, max_val + 1))

        values = []
        parts = field.split(",")

        for part in parts:
            if "/" in part:
                # Step values like */5 or 10/5
                base, step = part.split("/")
                step = int(step)
                if base == "*":
                    values.extend(range(min_val, max_val + 1, step))
                else:
                    start = int(base)
                    values.extend(range(start, max_val + 1, step))
            elif "-" in part:
                # Ranges like 1-5
                start, end = map(int, part.split("-"))
                values.extend(range(start, end + 1))
            else:
                # Single values
                values.append(int(part))

        # Validate range
        for val in values:
            if val < min_val or val > max_val:
                raise ValueError(f"Value {val} out of range [{min_val}, {max_val}]")

        return sorted(list(set(values)))

    def get_next_run(self, after: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next cron schedule run time."""
        if after is None:
            after = datetime.now(self._tz)
        else:
            # Convert to our timezone
            after = after.astimezone(self._tz)

        # Start from the next minute
        current = after.replace(second=0, microsecond=0) + timedelta(minutes=1)

        # Try up to 1 year ahead
        for _ in range(365 * 24 * 60):  # 1 year in minutes
            if (
                current.minute in self._parsed["minute"]
                and current.hour in self._parsed["hour"]
                and current.day in self._parsed["day"]
                and current.month in self._parsed["month"]
                and current.weekday() in self._parsed["day_of_week"]
            ):
                return current

            current += timedelta(minutes=1)

        return None  # No match found


class CalendarSchedule(Schedule):
    """Schedule based on calendar events and dates."""

    def __init__(self, name: str, calendar_rules: Dict[str, Any], timezone: Optional[str] = None):
        super().__init__(name, timezone)
        self.calendar_rules = calendar_rules

    def get_next_run(self, after: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next calendar-based run time."""
        if after is None:
            after = datetime.now(self._tz)
        else:
            after = after.astimezone(self._tz)

        # Simple implementation - can be extended with calendar libraries
        # For now, support basic rules like "first Monday of month"

        rule_type = self.calendar_rules.get("type", "monthly")

        if rule_type == "monthly":
            # First Monday of month, etc.
            weekday = self.calendar_rules.get("weekday", 0)  # 0=Monday
            week = self.calendar_rules.get("week", 1)  # 1=first, 2=second, etc.

            current = after.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            # Find next month if we're past the date this month
            while True:
                # Find the nth weekday of the month
                day_found = self._find_nth_weekday(current.year, current.month, weekday, week)
                if day_found:
                    scheduled = current.replace(day=day_found)
                    if scheduled > after:
                        return scheduled

                # Try next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

        elif rule_type == "weekly":
            # Every Wednesday, etc.
            weekday = self.calendar_rules.get("weekday", 0)
            current = after + timedelta(days=(weekday - after.weekday()) % 7)
            current = current.replace(hour=0, minute=0, second=0, microsecond=0)
            if current <= after:
                current += timedelta(days=7)
            return current

        elif rule_type == "daily":
            # Every day at specific time
            hour = self.calendar_rules.get("hour", 0)
            minute = self.calendar_rules.get("minute", 0)
            current = after.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if current <= after:
                current += timedelta(days=1)
            return current

        return None

    def _find_nth_weekday(self, year: int, month: int, weekday: int, n: int) -> Optional[int]:
        """Find the nth weekday of the month."""
        import calendar

        cal = calendar.monthcalendar(year, month)
        weekdays = [week[weekday] for week in cal if week[weekday] != 0]

        if len(weekdays) >= n:
            return weekdays[n - 1]
        return None


class IntervalSchedule(Schedule):
    """Simple interval-based schedule."""

    def __init__(self, name: str, interval_seconds: int, timezone: Optional[str] = None):
        super().__init__(name, timezone)
        self.interval_seconds = interval_seconds

    def get_next_run(self, after: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next interval-based run time."""
        if after is None:
            after = datetime.now(self._tz)

        # Calculate next interval
        seconds_since_epoch = after.timestamp()
        intervals_passed = seconds_since_epoch // self.interval_seconds
        next_run_seconds = (intervals_passed + 1) * self.interval_seconds

        return datetime.fromtimestamp(next_run_seconds, self._tz)


class Scheduler:
    """Advanced scheduler managing multiple schedules and callbacks."""

    def __init__(self):
        self.schedules: Dict[str, Schedule] = {}
        self._callbacks: Dict[str, List[Callable[[ScheduleEvent], Awaitable[None]]]] = {}
        self._running = False
        self._check_task: Optional[asyncio.Task] = None
        self._last_runs: Dict[str, datetime] = {}

    def add_schedule(self, schedule: Schedule) -> None:
        """Add a schedule to the scheduler."""
        self.schedules[schedule.name] = schedule
        self._callbacks[schedule.name] = []
        logger.info(f"Added schedule '{schedule.name}'")

    def remove_schedule(self, name: str) -> None:
        """Remove a schedule."""
        if name in self.schedules:
            del self.schedules[name]
            del self._callbacks[name]
            self._last_runs.pop(name, None)
            logger.info(f"Removed schedule '{name}'")

    def add_callback(
        self, schedule_name: str, callback: Callable[[ScheduleEvent], Awaitable[None]]
    ) -> None:
        """Add a callback for a schedule."""
        if schedule_name in self._callbacks:
            self._callbacks[schedule_name].append(callback)

    def remove_callback(
        self, schedule_name: str, callback: Callable[[ScheduleEvent], Awaitable[None]]
    ) -> None:
        """Remove a callback from a schedule."""
        if schedule_name in self._callbacks:
            self._callbacks[schedule_name].remove(callback)

    async def _check_schedules(self) -> None:
        """Check all schedules and fire events."""
        while self._running:
            try:
                now = datetime.now(timezone.utc)
                tasks = []

                for name, schedule in self.schedules.items():
                    if schedule.is_due(now):
                        last_run = self._last_runs.get(name)
                        next_run = schedule.get_next_run(now)

                        if next_run:
                            event = ScheduleEvent(
                                schedule_name=name,
                                next_run=next_run,
                                last_run=last_run,
                                data={"scheduled_time": next_run.isoformat()},
                            )

                            # Fire callbacks
                            for callback in self._callbacks[name]:
                                tasks.append(callback(event))

                            self._last_runs[name] = now

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            except Exception as e:
                logger.error(f"Error checking schedules: {e}")

            await asyncio.sleep(30.0)  # Check every 30 seconds

    async def start(self) -> None:
        """Start the scheduler."""
        if self._running:
            return

        self._running = True
        self._check_task = asyncio.create_task(self._check_schedules())
        logger.info(f"Started scheduler with {len(self.schedules)} schedules")

    async def stop(self) -> None:
        """Stop the scheduler."""
        if not self._running:
            return

        self._running = False
        if self._check_task:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass

        logger.info("Stopped scheduler")

    def list_schedules(self) -> List[Dict[str, Any]]:
        """List all schedules with their status."""
        now = datetime.now(timezone.utc)
        return [
            {
                "name": name,
                "type": schedule.__class__.__name__,
                "timezone": schedule.timezone,
                "next_run": schedule.get_next_run(now),
                "callback_count": len(self._callbacks[name]),
                "last_run": self._last_runs.get(name),
            }
            for name, schedule in self.schedules.items()
        ]

    def get_schedule(self, name: str) -> Optional[Schedule]:
        """Get a schedule by name."""
        return self.schedules.get(name)
