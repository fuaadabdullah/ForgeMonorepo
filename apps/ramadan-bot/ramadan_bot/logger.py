"""Logging setup for Ramadan bot."""

import logging
import sys
import os
from .config import LOG_DIR

# Configure logger
logger = logging.getLogger("ramadan_bot")
logger.setLevel(logging.INFO)

# File handler
log_file = os.path.join(LOG_DIR, "ramadan_bot.log")
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
)
logger.addHandler(file_handler)

# stdout handler (for CI visibility)
stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
)
logger.addHandler(stdout_handler)

__all__ = ["logger"]
