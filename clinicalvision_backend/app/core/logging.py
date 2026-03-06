"""
Centralized logging configuration
Provides structured logging for production environments
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.core.config import settings


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
    
    # Console handler with colored output
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
    file_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s"
    )
    file_handler.setFormatter(file_format)
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger


# Global logger instance
logger = setup_logging()
