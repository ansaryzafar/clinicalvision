"""
Public contact and research-demo request endpoints.

Unauthenticated by design (visitors have no account), so they are protected
by strict validation, a honeypot field, per-IP and global rate limits.
Messages are stored before anything else happens; see
``app.services.contact_service`` for the delivery guarantee.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip_key, get_rate_limit, limiter
from app.db.session import get_db
from app.schemas.contact import (
    ContactFormRequest,
    DemoRequestFormRequest,
    FormSubmissionResponse,
)
from app.services import contact_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Public Forms"])

_SAVE_FAILED = (
    "We could not save your message right now. "
    "Please try again shortly or email hello@clinicalvision.ai directly."
)


def _global_key(request: Request) -> str:  # slowapi requires the parameter to be named "request"
    return "contact-forms-global"


def _accept(db: Session, create, form, background_tasks: BackgroundTasks) -> FormSubmissionResponse:
    # Honeypot: bots fill the hidden field. Pretend success, store nothing.
    if form.website:
        logger.info("Contact form honeypot triggered; submission discarded")
        return FormSubmissionResponse()

    try:
        stored = create(db, form)
    except Exception:
        logger.exception("Failed to store public form submission")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_SAVE_FAILED)

    background_tasks.add_task(contact_service.deliver_message, stored.id)
    return FormSubmissionResponse(reference=str(stored.id))


@router.post(
    "/contact",
    response_model=FormSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit the public contact form",
)
@limiter.limit(get_rate_limit("contact"), key_func=client_ip_key)
@limiter.limit(get_rate_limit("contact_global"), key_func=_global_key)
def submit_contact_form(
    request: Request,
    response: Response,
    payload: ContactFormRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return _accept(db, contact_service.create_contact_message, payload, background_tasks)


@router.post(
    "/demo-request",
    response_model=FormSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit the research-demo request form",
)
@limiter.limit(get_rate_limit("contact"), key_func=client_ip_key)
@limiter.limit(get_rate_limit("contact_global"), key_func=_global_key)
def submit_demo_request(
    request: Request,
    response: Response,
    payload: DemoRequestFormRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return _accept(db, contact_service.create_demo_request, payload, background_tasks)
