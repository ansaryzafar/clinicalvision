"""
Tests for the public contact / demo-request pipeline.

Covers: validation, persistence-before-email, delivery bookkeeping,
retry with back-off, honeypot, header-injection defence, rate limiting
and client-IP detection behind the nginx proxy.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.requests import Request

from app.core.rate_limit import client_ip_key, limiter
from app.db.models.contact_message import ContactMessage
from app.db.session import get_db
from app.services import contact_service
from main import app


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(element, compiler, **kw):
    return "CHAR(32)"


@pytest.fixture()
def session_factory(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    ContactMessage.__table__.create(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(contact_service, "SessionLocal", factory)
    return factory


@pytest.fixture()
def client(session_factory):
    def _get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    limiter.reset()
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)
    limiter.reset()


@pytest.fixture()
def smtp(monkeypatch):
    """Configured SMTP with a fake sender that records emails."""
    cfg = SimpleNamespace(
        EMAIL_ENABLED=True,
        SMTP_HOST="smtp.test",
        SMTP_PORT=587,
        SMTP_USER="user",
        SMTP_PASSWORD="pw",
        SMTP_TLS=True,
        SMTP_SSL=False,
        EMAIL_FROM="noreply@clinicalvision.ai",
        EMAIL_FROM_NAME="ClinicalVision AI",
    )
    monkeypatch.setattr(contact_service, "get_email_settings", lambda: cfg)
    state = SimpleNamespace(sent=[], fail=False)

    def fake_send(email, recipients):
        if state.fail:
            raise ConnectionError("smtp down")
        state.sent.append((email, recipients))

    monkeypatch.setattr(contact_service, "_send_via_smtp", fake_send)
    state.cfg = cfg
    return state


CONTACT = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines",
    "subject": "Question about the model",
    "message": "Hello, how was the model validated?",
}

DEMO = {
    "firstName": "Grace",
    "lastName": "Hopper",
    "email": "grace@example.com",
    "role": "Researcher",
    "message": "Interested in the research demo.",
}


def _rows(session_factory):
    with session_factory() as db:
        return list(db.execute(select(ContactMessage)).scalars())


class TestContactEndpoint:
    def test_success_stores_and_emails(self, client, smtp, session_factory):
        r = client.post("/api/v1/contact", json=CONTACT)
        assert r.status_code == 202
        assert r.json()["success"] is True and r.json()["reference"]

        (row,) = _rows(session_factory)
        assert row.delivery_status == "sent" and row.attempts == 1 and row.sent_at
        email, recipients = smtp.sent[0]
        assert recipients == ["hello@clinicalvision.ai"]
        assert "ada@example.com" in str(email["Reply-To"])
        assert "how was the model validated" in email.get_content()

    def test_message_kept_when_smtp_fails(self, client, smtp, session_factory):
        smtp.fail = True
        r = client.post("/api/v1/contact", json=CONTACT)
        assert r.status_code == 202  # visitor's message is safe

        (row,) = _rows(session_factory)
        assert row.delivery_status == "failed"
        assert "smtp down" in row.last_error
        assert row.next_attempt_at is not None

    def test_message_kept_when_smtp_not_configured(self, client, session_factory, monkeypatch):
        cfg = SimpleNamespace(EMAIL_ENABLED=False, SMTP_HOST="", SMTP_USER="", SMTP_PASSWORD="")
        monkeypatch.setattr(contact_service, "get_email_settings", lambda: cfg)
        assert client.post("/api/v1/contact", json=CONTACT).status_code == 202
        (row,) = _rows(session_factory)
        assert row.delivery_status == "failed" and "not configured" in row.last_error

    @pytest.mark.parametrize(
        "patch",
        [
            {"email": "not-an-email"},
            {"name": ""},
            {"message": ""},
            {"message": "x" * 5001},
            {"name": "Eve\r\nBcc: victim@example.com"},
            {"subject": "Hi\nBcc: victim@example.com"},
        ],
    )
    def test_invalid_input_rejected_and_not_stored(self, client, smtp, session_factory, patch):
        r = client.post("/api/v1/contact", json={**CONTACT, **patch})
        assert r.status_code == 422
        assert _rows(session_factory) == []

    def test_honeypot_discards_silently(self, client, smtp, session_factory):
        r = client.post("/api/v1/contact", json={**CONTACT, "website": "http://spam.example"})
        assert r.status_code == 202
        assert _rows(session_factory) == [] and smtp.sent == []

    def test_rate_limited_per_ip(self, client, smtp):
        codes = [client.post("/api/v1/contact", json=CONTACT).status_code for _ in range(6)]
        assert codes[:5] == [202] * 5
        assert codes[5] == 429

    def test_html_in_message_stays_plain_text(self, client, smtp):
        client.post("/api/v1/contact", json={**CONTACT, "message": "<script>alert(1)</script>"})
        email, _ = smtp.sent[0]
        assert not email.is_multipart()
        assert email.get_content_type() == "text/plain"


class TestDemoRequestEndpoint:
    def test_success(self, client, smtp, session_factory):
        r = client.post("/api/v1/demo-request", json=DEMO)
        assert r.status_code == 202
        (row,) = _rows(session_factory)
        assert row.kind == "demo_request" and row.name == "Grace Hopper"
        assert row.delivery_status == "sent"
        assert "Demo request" in str(smtp.sent[0][0]["Subject"])

    def test_requires_names_and_email(self, client, smtp):
        assert client.post("/api/v1/demo-request", json={"email": "a@b.co"}).status_code == 422


class TestRetry:
    def test_failed_message_is_retried_until_sent(self, client, smtp, session_factory):
        smtp.fail = True
        client.post("/api/v1/contact", json=CONTACT)

        # Not due yet -> nothing happens
        assert contact_service.retry_due_messages() == 0

        # Make it due, SMTP still down -> stays failed, back-off grows
        with session_factory() as db:
            row = db.execute(select(ContactMessage)).scalar_one()
            row.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            db.commit()
        assert contact_service.retry_due_messages() == 0
        (row,) = _rows(session_factory)
        assert row.attempts == 2 and row.delivery_status == "failed"

        # SMTP recovers
        smtp.fail = False
        with session_factory() as db:
            r = db.execute(select(ContactMessage)).scalar_one()
            r.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            db.commit()
        assert contact_service.retry_due_messages() == 1
        (row,) = _rows(session_factory)
        assert row.delivery_status == "sent" and row.attempts == 3 and row.last_error is None

    def test_sent_message_is_never_resent(self, client, smtp, session_factory):
        client.post("/api/v1/contact", json=CONTACT)
        (row,) = _rows(session_factory)
        assert contact_service.deliver_message(row.id) is True
        assert len(smtp.sent) == 1

    def test_backoff_is_capped(self):
        assert contact_service._backoff_seconds(1) == 60
        assert contact_service._backoff_seconds(3) == 240
        assert contact_service._backoff_seconds(50) == 3600


class TestSmtpTransport:
    def test_starttls_login_and_send(self, smtp, monkeypatch):
        calls = []

        class FakeSMTP:
            def __init__(self, host, port, timeout=None):
                calls.append(("connect", host, port, timeout))

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                calls.append(("quit",))

            def ehlo(self):
                calls.append(("ehlo",))

            def starttls(self, context=None):
                calls.append(("starttls",))

            def login(self, user, pw):
                calls.append(("login", user))

            def send_message(self, msg, from_addr=None, to_addrs=None):
                calls.append(("send", from_addr, tuple(to_addrs)))
                return {}

        monkeypatch.undo()  # restore the real _send_via_smtp (fixture patched it)
        monkeypatch.setattr(contact_service, "get_email_settings", lambda: smtp.cfg)
        monkeypatch.setattr(contact_service.smtplib, "SMTP", FakeSMTP)

        contact_service._send_via_smtp(contact_service.EmailMessage(), ["hello@clinicalvision.ai"])

        names = [c[0] for c in calls]
        assert names.index("starttls") < names.index("login") < names.index("send")
        assert calls[0][3] == contact_service.SMTP_TIMEOUT_SECONDS  # never hangs forever

    def test_non_ascii_name_builds_valid_email(self, smtp):
        msg = ContactMessage(
            kind="contact", name="Zoë Müller", email="zoe@example.com", message="Grüße"
        )
        email = contact_service.build_notification(msg)
        assert "Grüße" in email.get_content()
        assert "zoe@example.com" in str(email["Reply-To"])


def _request(peer: str, headers=None) -> Request:
    return Request(
        {
            "type": "http",
            "client": (peer, 1234),
            "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        }
    )


class TestClientIpKey:
    def test_uses_real_ip_behind_private_proxy(self):
        assert client_ip_key(_request("172.18.0.5", {"X-Real-IP": "203.0.113.9"})) == "203.0.113.9"

    def test_ignores_spoofed_header_from_public_peer(self):
        assert client_ip_key(_request("8.8.8.8", {"X-Real-IP": "1.2.3.4"})) == "8.8.8.8"

    def test_ignores_garbage_header(self):
        assert client_ip_key(_request("172.18.0.5", {"X-Real-IP": "nope"})) == "172.18.0.5"
