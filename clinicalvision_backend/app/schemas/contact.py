"""
Schemas for the public contact form and research-demo request form.

These endpoints are unauthenticated, so every field is treated as hostile:
whitespace is stripped, lengths are capped, control characters are rejected
in single-line fields (prevents email header injection) and a hidden
honeypot field is used to catch simple bots.
"""

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# Any ASCII control character (includes CR, LF, TAB, NUL)
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
# Control characters that are never legitimate in free text (keeps \n, \r, \t)
_BAD_TEXT_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _single_line(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if _CONTROL_CHARS.search(value):
        raise ValueError("must not contain control characters or line breaks")
    return value or None


class _PublicForm(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    # Honeypot: real users never see or fill this field.
    website: Optional[str] = Field(default=None, max_length=500)


class ContactFormRequest(_PublicForm):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)

    @field_validator("name", "company", "subject")
    @classmethod
    def _no_line_breaks(cls, v: Optional[str]) -> Optional[str]:
        return _single_line(v)

    @field_validator("message")
    @classmethod
    def _clean_message(cls, v: str) -> str:
        if _BAD_TEXT_CHARS.search(v):
            raise ValueError("contains invalid characters")
        return v


class DemoRequestFormRequest(_PublicForm):
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    role: Optional[str] = Field(default=None, max_length=100)
    message: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("firstName", "lastName", "phone", "company", "role")
    @classmethod
    def _no_line_breaks(cls, v: Optional[str]) -> Optional[str]:
        return _single_line(v)

    @field_validator("message")
    @classmethod
    def _clean_message(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if _BAD_TEXT_CHARS.search(v):
            raise ValueError("contains invalid characters")
        return v or None


class FormSubmissionResponse(BaseModel):
    success: bool = True
    reference: Optional[str] = Field(
        default=None,
        description="Reference ID for the stored message",
    )
    message: str = "Your message has been received."
