#!/usr/bin/env python3
"""Celery worker management script for ForgeTM."""

import argparse
import os
import subprocess
import sys
from pathlib import Path

# Add the src directory to Python path
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))


def start_worker(queues: str = "celery", concurrency: int = 2, log_level: str = "info"):
    """Start a Celery worker process."""
    cmd = [
        "celery",
        "-A", "forge.celery_app",
        "worker",
        "--loglevel", log_level,
        "--concurrency", str(concurrency),
        "--queues", queues,
        "--hostname", f"forge-worker@{os.uname().nodename}",
    ]

    print(f"Starting Celery worker with command: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nWorker stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"Worker failed with exit code: {e.returncode}")
        sys.exit(e.returncode)


def start_beat():
    """Start Celery beat scheduler for periodic tasks."""
    cmd = [
        "celery",
        "-A", "forge.celery_app",
        "beat",
        "--loglevel", "info",
        "--scheduler", "celery.beat.PersistentScheduler",
        "--pidfile", "/tmp/celery-beat.pid",
    ]

    print(f"Starting Celery beat with command: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nBeat stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"Beat failed with exit code: {e.returncode}")
        sys.exit(e.returncode)


def check_health():
    """Check the health of Celery workers."""
    from forge.celery_app import get_celery_stats, is_celery_healthy

    print("Checking Celery health...")

    if is_celery_healthy():
        print("✅ Celery workers are healthy")
        stats = get_celery_stats()
        print(f"Active tasks: {len(stats.get('active_tasks', {}))}")
        print(f"Registered tasks: {len(stats.get('registered_tasks', {}))}")
        return True
    else:
        print("❌ No Celery workers available")
        return False


def main():
    parser = argparse.ArgumentParser(description="ForgeTM Celery Worker Management")
    parser.add_argument(
        "command",
        choices=["worker", "beat", "health"],
        help="Command to run"
    )
    parser.add_argument(
        "--queues",
        default="celery",
        help="Queues to consume from (default: celery)"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=2,
        help="Number of worker processes (default: 2)"
    )
    parser.add_argument(
        "--log-level",
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Logging level (default: info)"
    )

    args = parser.parse_args()

    if args.command == "worker":
        start_worker(args.queues, args.concurrency, args.log_level)
    elif args.command == "beat":
        start_beat()
    elif args.command == "health":
        success = check_health()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
