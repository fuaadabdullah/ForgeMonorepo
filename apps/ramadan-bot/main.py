#!/usr/bin/env python3
"""Ramadan Fajr Bot - main entry point."""

import sys
import json
import argparse
from ramadan_bot.cli import send_today, ci_run, daemon_run
from ramadan_bot.ui import run_streamlit_ui
from ramadan_bot.logger import logger


def main():
    """Parse CLI arguments and dispatch to appropriate mode."""
    parser = argparse.ArgumentParser(
        description="Ramadan Fajr Bot - Daily Quranic verse delivery at Fajr time",
        prog="ramadan-bot",
    )

    parser.add_argument(
        "--ci-run",
        action="store_true",
        help="CI mode: compute Fajr and send only if within Fajr window",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Launch Streamlit UI (use: streamlit run ramadan_production.py -- --preview)",
    )
    parser.add_argument(
        "--send-now",
        action="store_true",
        help="Send today's Fajr message immediately",
    )
    parser.add_argument(
        "--juz",
        type=int,
        help="Force specific Juz number (1-30)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force actions even if sent-marker already exists",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Daemon mode: run continuously through Ramadan, sleeping between Fajrs",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=60,
        help="For CI mode: minutes after Fajr to send (default: 60)",
    )

    args = parser.parse_args()

    try:
        if args.preview:
            run_streamlit_ui()
        elif args.daemon:
            daemon_run()
        elif args.ci_run:
            res = ci_run(window_minutes=args.window, force=args.force)
            print(json.dumps(res))
            sys.exit(0 if res.get("sent") else 1)
        elif args.send_now:
            res = send_today(juz_override=args.juz, force=args.force)
            print(json.dumps(res))
            sys.exit(0 if res.get("sent") else 1)
        else:
            parser.print_help()
            print(
                "\nNo mode selected. Use --daemon for auto-run, --ci-run for CI, "
                "--send-now to send immediately, or --preview for UI."
            )
    except Exception as e:
        logger.exception("Fatal error")
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
