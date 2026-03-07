"""
Centralized logging configuration
Provides structured logging for production environments

In production / non-debug mode the file handler emits JSON lines that can
be ingested by ELK, CloudWatch, Datadog, etc.  Console output stays human-
readable for development convenience.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """
    Format log records as single-line JSON objects.

    Each line includes:
      timestamp, level, logger, message, module, funcName,
      lineno, and the current request correlation_id (if set).
    """

    def format(self, record: logging.LogRecord) -> str:
        # Import here to avoid circular dependency
        from app.middleware.correlation_id import correlation_id_ctx

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineno": record.lineno,
            "correlation_id": correlation_id_ctx.get(""),
        }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_logging() -> logging.Logger:
    """
    Configure application logging with appropriate handlers and formatters
    
    Returns:
        Logger instance configured for the application
    """
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger("clinicalvision")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()
    
    # Console handler with colored output (human-readable)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    console_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    
    # Rotating file handler for persistent logs with automatic rotation
    file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=10_000_000,  # 10 MB per file
        backupCount=5,        # Keep 5 backup files
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)

    # Use structured JSON for file logs (machine-parseable)
    file_handler.setFormatter(JSONFormatter())
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger


# Global logger instance
logger = setup_logging()
