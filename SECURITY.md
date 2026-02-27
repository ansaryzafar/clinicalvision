# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| < 1.0 | No |

## Reporting a Vulnerability

If you discover a security vulnerability in ClinicalVision, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email security concerns to the maintainers directly. Include:

1. Description of the vulnerability.
2. Steps to reproduce.
3. Potential impact assessment.
4. Suggested fix, if any.

We will acknowledge receipt within 48 hours and provide an initial assessment within 5 business days.

## Security Practices

ClinicalVision implements the following security measures:

- JWT-based authentication with configurable token expiration.
- Password hashing with bcrypt.
- Rate limiting on authentication endpoints.
- Security headers middleware (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).
- Input validation via Pydantic schemas on all API endpoints.
- SQL injection prevention through SQLAlchemy ORM parameterized queries.
- CORS configuration with explicit origin allowlists.
- File upload validation (type checking, size limits).
- Audit logging for authentication events and clinical operations.

## Environment Security

- Never commit `.env` files. Use the provided `.env.*.example` templates.
- Rotate JWT secret keys periodically in production.
- Use strong, unique database passwords.
- Enable TLS/SSL for all production traffic.
- Restrict database access to application service accounts only.
