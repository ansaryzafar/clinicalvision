"""
Contact message model (durable inbox + email outbox)

Every message submitted through the public contact form or the research-demo
request form is written to this table *before* any email is attempted. The
database row is the source of truth: if SMTP is down or misconfigured the
message is not lost, and a background worker keeps retrying delivery of the
notification email until it succeeds.
"""

from sqlalchemy import Column, String, Text, Integer, DateTime
import enum

from app.db.base import BaseModel


class ContactKind(str, enum.Enum):
    """Which public form produced the message"""
    CONTACT = "contact"
    DEMO_REQUEST = "demo_request"


class DeliveryStatus(str, enum.Enum):
    """Delivery state of the notification email"""
    PENDING = "pending"   # stored, notification not yet sent
    SENT = "sent"         # notification email accepted by the SMTP server
    FAILED = "failed"     # last attempt failed; will be retried


class ContactMessage(BaseModel):
    """A message submitted through a public form"""

    __tablename__ = "contact_messages"

    kind = Column(String(20), nullable=False, index=True, default=ContactKind.CONTACT.value)

    # Submitter details (all user supplied, so treated as untrusted)
    name = Column(String(200), nullable=False)
    email = Column(String(254), nullable=False)
    company = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    role = Column(String(100), nullable=True)
    subject = Column(String(200), nullable=True)
    message = Column(Text, nullable=True)

    # Notification delivery tracking
    delivery_status = Column(
        String(10), nullable=False, index=True, default=DeliveryStatus.PENDING.value
    )
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<ContactMessage {self.id} kind={self.kind} status={self.delivery_status}>"
