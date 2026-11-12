"""
Contact / demo-request service

Delivery guarantee
------------------
1. A submission is written to the database and committed *first*. From that
   moment it cannot be lost, whatever happens to SMTP.
2. A notification email is attempted immediately (in a background task).
3. If the attempt fails (SMTP down, bad credentials, network error, SMTP not
   configured) the row is marked ``failed`` and a background worker retries
   with exponential back-off (capped at one hour) until it succeeds.

Anything still not delivered can be listed with::

    SELECT id, kind, email, attempts, last_error FROM contact_messages
    WHERE delivery_status <> 'sent' ORDER BY created_at;
"""

import asyncio
import logging
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.headerregistry import Address
from email.message import EmailMessage
from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.contact_message import ContactKind, ContactMessage, DeliveryStatus
from app.db.session import SessionLocal
from app.schemas.contact import ContactFormRequest, DemoRequestFormRequest
from app.services.email_service import get_email_settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15
BACKOFF_BASE_SECONDS = 60
BACKOFF_MAX_SECONDS = 3600
FIRST_RETRY_DELAY_SECONDS = 60
RETRY_BATCH_SIZE = 20
MAX_ERROR_LENGTH = 1000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Storing submissions
# ---------------------------------------------------------------------------

def create_contact_message(db: Session, form: ContactFormRequest) -> ContactMessage:
    msg = ContactMessage(
        kind=ContactKind.CONTACT.value,
        name=form.name,
        email=str(form.email),
        company=form.company,
        subject=form.subject,
        message=form.message,
    )
    return _persist(db, msg)


def create_demo_request(db: Session, form: DemoRequestFormRequest) -> ContactMessage:
    msg = ContactMessage(
        kind=ContactKind.DEMO_REQUEST.value,
        name=f"{form.firstName} {form.lastName}",
        email=str(form.email),
        company=form.company,
        phone=form.phone,
        role=form.role,
        subject="Research demo request",
        message=form.message,
    )
    return _persist(db, msg)


def _persist(db: Session, msg: ContactMessage) -> ContactMessage:
    msg.delivery_status = DeliveryStatus.PENDING.value
    msg.attempts = 0
    # Safety net: if the immediate background attempt never runs (process
    # restart, crash) the retry worker picks the message up shortly after.
    msg.next_attempt_at = _utcnow() + timedelta(seconds=FIRST_RETRY_DELAY_SECONDS)
    try:
        db.add(msg)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(msg)
    return msg


# ---------------------------------------------------------------------------
# Building and sending the notification email
# ---------------------------------------------------------------------------

def notification_recipients() -> List[str]:
    return [a.strip() for a in settings.CONTACT_NOTIFY_EMAIL.split(",") if a.strip()]


def smtp_is_configured() -> bool:
    cfg = get_email_settings()
    return bool(
        cfg.EMAIL_ENABLED and cfg.SMTP_HOST and cfg.SMTP_USER and cfg.SMTP_PASSWORD
    )


def _clean_header(value: str, limit: int = 150) -> str:
    return " ".join(value.split())[:limit]


def build_notification(msg: ContactMessage) -> EmailMessage:
    """Build a plain-text notification. Plain text only: nothing the visitor
    typed is ever interpreted as HTML."""
    cfg = get_email_settings()
    label = "Demo request" if msg.kind == ContactKind.DEMO_REQUEST.value else "Contact form"
    topic = _clean_header(msg.subject or "New message", 80)

    email = EmailMessage()
    email["Subject"] = _clean_header(f"[ClinicalVision] {label}: {topic} - {msg.name}")
    email["From"] = str(Address(display_name=cfg.EMAIL_FROM_NAME, addr_spec=cfg.EMAIL_FROM))
    email["To"] = ", ".join(notification_recipients())
    try:
        email["Reply-To"] = str(Address(display_name=_clean_header(msg.name, 80), addr_spec=msg.email))
    except Exception:  # unusual address: still deliver, reply manually from the body
        logger.warning("Could not set Reply-To for message %s", msg.id)

    created = msg.created_at.isoformat() if msg.created_at else "unknown"
    lines = [
        f"{label} received via clinicalvision.ai",
        "",
        f"Reference : {msg.id}",
        f"Received  : {created}",
        f"Name      : {msg.name}",
        f"Email     : {msg.email}",
    ]
    for title, value in (
        ("Company", msg.company),
        ("Phone", msg.phone),
        ("Role", msg.role),
        ("Subject", msg.subject),
    ):
        if value:
            lines.append(f"{title:<10}: {value}")
    lines += ["", "Message:", "-" * 40, msg.message or "(no message)", "-" * 40, "",
              "Reply to this email to answer the sender directly."]
    email.set_content("\n".join(lines))
    return email


def _send_via_smtp(email: EmailMessage, recipients: List[str]) -> None:
    """Send one email. Raises on any failure so the caller can record it."""
    cfg = get_email_settings()
    context = ssl.create_default_context()

    if cfg.SMTP_SSL:
        server: smtplib.SMTP = smtplib.SMTP_SSL(
            cfg.SMTP_HOST, cfg.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS, context=context
        )
    else:
        server = smtplib.SMTP(cfg.SMTP_HOST, cfg.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS)

    with server:
        server.ehlo()
        if not cfg.SMTP_SSL and cfg.SMTP_TLS:
            server.starttls(context=context)
            server.ehlo()
        server.login(cfg.SMTP_USER, cfg.SMTP_PASSWORD)
        refused = server.send_message(email, from_addr=cfg.EMAIL_FROM, to_addrs=recipients)
    if refused:
        raise smtplib.SMTPRecipientsRefused(refused)


# ---------------------------------------------------------------------------
# Delivery with retry bookkeeping
# ---------------------------------------------------------------------------

def _backoff_seconds(attempts: int) -> int:
    return min(BACKOFF_BASE_SECONDS * (2 ** max(attempts - 1, 0)), BACKOFF_MAX_SECONDS)


def deliver_message(message_id, session_factory=None) -> bool:
    """
    Try to send the notification for one stored message and record the result.
    Safe to call concurrently: the row is locked while sending, and a message
    that is already ``sent`` is never sent twice.
    """
    db: Session = (session_factory or SessionLocal)()
    try:
        msg = db.execute(
            select(ContactMessage)
            .where(ContactMessage.id == message_id)
            .with_for_update(skip_locked=True)
        ).scalar_one_or_none()

        if msg is None or msg.delivery_status == DeliveryStatus.SENT.value:
            return msg is not None  # locked elsewhere, or already delivered

        now = _utcnow()
        msg.attempts = (msg.attempts or 0) + 1
        msg.last_attempt_at = now
        try:
            if not smtp_is_configured():
                raise RuntimeError(
                    "SMTP is not configured (set EMAIL_ENABLED=true, SMTP_HOST, SMTP_USER, SMTP_PASSWORD)"
                )
            recipients = notification_recipients()
            if not recipients:
                raise RuntimeError("CONTACT_NOTIFY_EMAIL is empty")
            _send_via_smtp(build_notification(msg), recipients)
        except Exception as exc:  # recorded, retried later; never raised to the visitor
            msg.delivery_status = DeliveryStatus.FAILED.value
            msg.last_error = f"{type(exc).__name__}: {exc}"[:MAX_ERROR_LENGTH]
            msg.next_attempt_at = now + timedelta(seconds=_backoff_seconds(msg.attempts))
            db.commit()
            logger.error(
                "Contact notification FAILED for %s (attempt %s, retry at %s): %s",
                msg.id, msg.attempts, msg.next_attempt_at.isoformat(), msg.last_error,
            )
            return False

        msg.delivery_status = DeliveryStatus.SENT.value
        msg.sent_at = now
        msg.last_error = None
        msg.next_attempt_at = None
        db.commit()
        logger.info("Contact notification sent for %s (attempt %s)", msg.id, msg.attempts)
        return True
    except Exception:
        db.rollback()
        logger.exception("Unexpected error delivering contact message %s", message_id)
        return False
    finally:
        db.close()


def retry_due_messages(session_factory=None, limit: int = RETRY_BATCH_SIZE) -> int:
    """Retry every undelivered message whose back-off has elapsed. Returns count sent."""
    db: Session = (session_factory or SessionLocal)()
    try:
        now = _utcnow()
        ids = list(
            db.execute(
                select(ContactMessage.id)
                .where(
                    ContactMessage.delivery_status != DeliveryStatus.SENT.value,
                    ContactMessage.is_deleted.is_(False),
                    or_(
                        ContactMessage.next_attempt_at.is_(None),
                        ContactMessage.next_attempt_at <= now,
                    ),
                )
                .order_by(ContactMessage.created_at)
                .limit(limit)
            ).scalars()
        )
    finally:
        db.close()

    return sum(1 for mid in ids if deliver_message(mid, session_factory))


async def retry_worker(interval_seconds: Optional[int] = None) -> None:
    """Background loop started from the application lifespan."""
    interval = interval_seconds or settings.CONTACT_RETRY_INTERVAL_SECONDS
    logger.info("Contact retry worker started (every %ss)", interval)
    while True:
        try:
            await asyncio.to_thread(retry_due_messages)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Contact retry worker iteration failed")
        await asyncio.sleep(interval)
