"""Sent-marker tracking — local file and S3 storage backends."""

import os
from datetime import date, datetime
import boto3
from botocore.exceptions import ClientError

from .. import config
from ..logger import logger

__all__ = ["already_sent_marker", "write_sent_marker"]


def _marker_path(date_obj: date) -> str:
    """Local file path for sent marker."""
    return os.path.join(config.MARKER_DIR, f"ramadan_sent_{date_obj.isoformat()}")


def already_sent_marker(date_obj: date, use_s3: bool = False) -> bool:
    """Check if we've already sent a message for this date.

    Args:
        date_obj: Date to check
        use_s3: If True, check S3; if False, check local filesystem

    Returns:
        bool: True if message was sent, False otherwise
    """
    key = f"sent-markers/{date_obj.isoformat()}.ok"

    if use_s3 and config.S3_BUCKET and config.AWS_ACCESS_KEY_ID:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
            region_name=config.AWS_REGION,
        )
        try:
            s3.head_object(Bucket=config.S3_BUCKET, Key=key)
            return True
        except ClientError:
            return False
    else:
        path = _marker_path(date_obj)
        return os.path.exists(path)


def write_sent_marker(date_obj: date, use_s3: bool = False) -> bool:
    """Write a sent marker for this date.

    Args:
        date_obj: Date to mark as sent
        use_s3: If True, write to S3; if False, write local file

    Returns:
        bool: True if successful
    """
    key = f"sent-markers/{date_obj.isoformat()}.ok"

    if use_s3 and config.S3_BUCKET and config.AWS_ACCESS_KEY_ID:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
            region_name=config.AWS_REGION,
        )
        s3.put_object(Bucket=config.S3_BUCKET, Key=key, Body=b"sent")
        logger.info(f"Wrote S3 marker: s3://{config.S3_BUCKET}/{key}")
        return True
    else:
        os.makedirs(config.MARKER_DIR, exist_ok=True)
        path = _marker_path(date_obj)
        with open(path, "w") as f:
            f.write(datetime.now().isoformat())
        logger.info(f"Wrote local marker: {path}")
        return True
