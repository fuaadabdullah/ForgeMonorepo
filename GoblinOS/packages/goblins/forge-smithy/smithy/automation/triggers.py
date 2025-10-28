"""
Event-driven triggers for automation.

Provides various trigger types for initiating automated workflows based on
file system changes, git operations, CI/CD events, and custom conditions.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class TriggerEvent:
    """Represents a trigger event with metadata."""

    trigger_type: str
    source: str
    timestamp: datetime
    data: Dict[str, Any]
    context: Dict[str, Any]


class Trigger(ABC):
    """Abstract base class for all triggers."""

    def __init__(self, name: str, enabled: bool = True):
        self.name = name
        self.enabled = enabled
        self._callbacks: List[Callable[[TriggerEvent], Awaitable[None]]] = []

    def add_callback(self, callback: Callable[[TriggerEvent], Awaitable[None]]) -> None:
        """Add a callback to be executed when trigger fires."""
        self._callbacks.append(callback)

    def remove_callback(self, callback: Callable[[TriggerEvent], Awaitable[None]]) -> None:
        """Remove a callback."""
        self._callbacks.remove(callback)

    async def _fire_event(self, event: TriggerEvent) -> None:
        """Fire the trigger event to all callbacks."""
        if not self.enabled:
            return

        logger.info(f"Trigger '{self.name}' fired: {event.trigger_type}")
        for callback in self._callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Error in trigger callback: {e}")

    @abstractmethod
    async def start(self) -> None:
        """Start the trigger monitoring."""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop the trigger monitoring."""
        pass


class FileSystemTrigger(Trigger):
    """Trigger based on file system changes."""

    def __init__(
        self,
        name: str,
        watch_paths: List[Path],
        patterns: Optional[List[str]] = None,
        ignore_patterns: Optional[List[str]] = None,
        enabled: bool = True,
    ):
        super().__init__(name, enabled)
        self.watch_paths = watch_paths
        self.patterns = patterns or ["*"]
        self.ignore_patterns = ignore_patterns or []
        self._watcher_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def _matches_pattern(self, path: Path) -> bool:
        """Check if path matches include/exclude patterns."""
        # Check ignore patterns first
        for ignore_pattern in self.ignore_patterns:
            if path.match(ignore_pattern):
                return False

        # Check include patterns
        for pattern in self.patterns:
            if path.match(pattern):
                return True

        return False

    async def _watch_filesystem(self) -> None:
        """Monitor filesystem for changes."""
        last_mtimes: Dict[Path, float] = {}

        # Initial scan
        for watch_path in self.watch_paths:
            if watch_path.exists():
                for path in watch_path.rglob("*"):
                    if path.is_file() and self._matches_pattern(path):
                        last_mtimes[path] = path.stat().st_mtime

        while not self._stop_event.is_set():
            try:
                await asyncio.sleep(1.0)  # Poll interval

                for watch_path in self.watch_paths:
                    if not watch_path.exists():
                        continue

                    for path in watch_path.rglob("*"):
                        if not path.is_file() or not self._matches_pattern(path):
                            continue

                        current_mtime = path.stat().st_mtime
                        last_mtime = last_mtimes.get(path)

                        if last_mtime is None:
                            # New file
                            last_mtimes[path] = current_mtime
                            event = TriggerEvent(
                                trigger_type="file_created",
                                source=str(path),
                                timestamp=datetime.now(),
                                data={"path": str(path), "action": "created"},
                                context={"watcher": self.name},
                            )
                            await self._fire_event(event)
                        elif current_mtime > last_mtime:
                            # Modified file
                            last_mtimes[path] = current_mtime
                            event = TriggerEvent(
                                trigger_type="file_modified",
                                source=str(path),
                                timestamp=datetime.now(),
                                data={"path": str(path), "action": "modified"},
                                context={"watcher": self.name},
                            )
                            await self._fire_event(event)

                # Check for deleted files
                to_remove = []
                for path in last_mtimes:
                    if not path.exists():
                        to_remove.append(path)
                        event = TriggerEvent(
                            trigger_type="file_deleted",
                            source=str(path),
                            timestamp=datetime.now(),
                            data={"path": str(path), "action": "deleted"},
                            context={"watcher": self.name},
                        )
                        await self._fire_event(event)

                for path in to_remove:
                    del last_mtimes[path]

            except Exception as e:
                logger.error(f"Error in filesystem watcher: {e}")
                await asyncio.sleep(5.0)  # Back off on errors

    async def start(self) -> None:
        """Start filesystem monitoring."""
        if self._watcher_task is not None:
            return

        self._stop_event.clear()
        self._watcher_task = asyncio.create_task(self._watch_filesystem())
        logger.info(
            f"Started filesystem trigger '{self.name}' watching {len(self.watch_paths)} paths"
        )

    async def stop(self) -> None:
        """Stop filesystem monitoring."""
        if self._watcher_task is None:
            return

        self._stop_event.set()
        self._watcher_task.cancel()
        try:
            await self._watcher_task
        except asyncio.CancelledError:
            pass

        self._watcher_task = None
        logger.info(f"Stopped filesystem trigger '{self.name}'")


class GitTrigger(Trigger):
    """Trigger based on git operations."""

    def __init__(self, name: str, repo_path: Path, enabled: bool = True):
        super().__init__(name, enabled)
        self.repo_path = repo_path
        self._last_commit: Optional[str] = None

    async def _check_git_changes(self) -> None:
        """Check for git changes."""
        try:
            import subprocess

            # Get current commit
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"], cwd=self.repo_path, capture_output=True, text=True
            )

            if result.returncode != 0:
                logger.error(f"Failed to get git commit: {result.stderr}")
                return

            current_commit = result.stdout.strip()

            if self._last_commit is None:
                # First check
                self._last_commit = current_commit
                return

            if current_commit != self._last_commit:
                # Commit changed
                event = TriggerEvent(
                    trigger_type="git_commit",
                    source=str(self.repo_path),
                    timestamp=datetime.now(),
                    data={
                        "previous_commit": self._last_commit,
                        "current_commit": current_commit,
                        "action": "commit",
                    },
                    context={"watcher": self.name},
                )
                await self._fire_event(event)
                self._last_commit = current_commit

        except Exception as e:
            logger.error(f"Error checking git changes: {e}")

    async def start(self) -> None:
        """Start git monitoring."""
        # Initial check
        await self._check_git_changes()

        # Schedule periodic checks
        async def periodic_check():
            while True:
                await asyncio.sleep(30.0)  # Check every 30 seconds
                await self._check_git_changes()

        self._check_task = asyncio.create_task(periodic_check())
        logger.info(f"Started git trigger '{self.name}' monitoring {self.repo_path}")

    async def stop(self) -> None:
        """Stop git monitoring."""
        if hasattr(self, "_check_task"):
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
        logger.info(f"Stopped git trigger '{self.name}'")


class CITrigger(Trigger):
    """Trigger based on CI/CD pipeline events."""

    def __init__(self, name: str, ci_provider: str = "auto", enabled: bool = True):
        super().__init__(name, enabled)
        self.ci_provider = ci_provider  # github, gitlab, jenkins, auto
        self._last_status: Optional[str] = None

    async def _check_ci_status(self) -> None:
        """Check CI/CD status from environment variables."""
        try:
            import os

            # Detect CI provider
            if self.ci_provider == "auto":
                if "GITHUB_ACTIONS" in os.environ:
                    provider = "github"
                elif "GITLAB_CI" in os.environ:
                    provider = "gitlab"
                elif "JENKINS_HOME" in os.environ:
                    provider = "jenkins"
                else:
                    return  # Not in CI environment
            else:
                provider = self.ci_provider

            # Get status based on provider
            status = None
            if provider == "github":
                status = os.getenv("GITHUB_JOB_STATUS", "unknown")
            elif provider == "gitlab":
                status = os.getenv("CI_JOB_STATUS", "unknown")
            elif provider == "jenkins":
                status = os.getenv("BUILD_STATUS", "unknown")

            if status and status != self._last_status:
                event = TriggerEvent(
                    trigger_type="ci_status_change",
                    source=f"ci_{provider}",
                    timestamp=datetime.now(),
                    data={
                        "provider": provider,
                        "previous_status": self._last_status,
                        "current_status": status,
                        "action": "status_change",
                    },
                    context={"watcher": self.name},
                )
                await self._fire_event(event)
                self._last_status = status

        except Exception as e:
            logger.error(f"Error checking CI status: {e}")

    async def start(self) -> None:
        """Start CI monitoring."""
        # Initial check
        await self._check_ci_status()

        # Schedule periodic checks
        async def periodic_check():
            while True:
                await asyncio.sleep(60.0)  # Check every minute
                await self._check_ci_status()

        self._check_task = asyncio.create_task(periodic_check())
        logger.info(f"Started CI trigger '{self.name}' monitoring {self.ci_provider}")

    async def stop(self) -> None:
        """Stop CI monitoring."""
        if hasattr(self, "_check_task"):
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
        logger.info(f"Stopped CI trigger '{self.name}'")


class TriggerManager:
    """Manages multiple triggers and their lifecycle."""

    def __init__(self):
        self.triggers: Dict[str, Trigger] = {}
        self._running = False

    def add_trigger(self, trigger: Trigger) -> None:
        """Add a trigger to the manager."""
        self.triggers[trigger.name] = trigger
        logger.info(f"Added trigger '{trigger.name}'")

    def remove_trigger(self, name: str) -> None:
        """Remove a trigger from the manager."""
        if name in self.triggers:
            trigger = self.triggers[name]
            if self._running:
                asyncio.create_task(trigger.stop())
            del self.triggers[name]
            logger.info(f"Removed trigger '{name}'")

    def get_trigger(self, name: str) -> Optional[Trigger]:
        """Get a trigger by name."""
        return self.triggers.get(name)

    async def start_all(self) -> None:
        """Start all triggers."""
        self._running = True
        start_tasks = []
        for trigger in self.triggers.values():
            if trigger.enabled:
                start_tasks.append(trigger.start())

        await asyncio.gather(*start_tasks, return_exceptions=True)
        logger.info(f"Started {len(start_tasks)} triggers")

    async def stop_all(self) -> None:
        """Stop all triggers."""
        self._running = False
        stop_tasks = []
        for trigger in self.triggers.values():
            stop_tasks.append(trigger.stop())

        await asyncio.gather(*stop_tasks, return_exceptions=True)
        logger.info("Stopped all triggers")

    def list_triggers(self) -> List[Dict[str, Any]]:
        """List all triggers with their status."""
        return [
            {
                "name": trigger.name,
                "type": trigger.__class__.__name__,
                "enabled": trigger.enabled,
                "callback_count": len(trigger._callbacks),
            }
            for trigger in self.triggers.values()
        ]
