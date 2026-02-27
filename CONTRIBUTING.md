# Contributing to ClinicalVision AI

Thank you for your interest in contributing to ClinicalVision. This document provides guidelines and information for contributors.

---

## Development Setup

1. Fork the repository and clone your fork.
2. Follow the setup instructions in [README.md](README.md#getting-started).
3. Create a feature branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name develop
   ```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready releases |
| `develop` | Integration branch for features |
| `feature/*` | New features |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Urgent production fixes |

---

## Code Standards

### Frontend (TypeScript/React)

- Use functional components with hooks.
- Define TypeScript interfaces for all props and API responses.
- Follow the existing MUI theme and component patterns.
- Place shared components in `src/components/shared/`.
- Place page components in `src/pages/`.

### Backend (Python/FastAPI)

- Follow PEP 8 conventions.
- Use Pydantic models for all request/response schemas.
- Add type hints to all function signatures.
- Place business logic in `app/services/`, not in endpoint handlers.
- Use structured logging via `structlog`.

---

## Testing Requirements

All contributions must maintain or improve test coverage.

### Frontend

```bash
cd clinicalvision_frontend
npm test -- --watchAll=false
```

- Write tests using Jest and React Testing Library.
- Place tests in `src/__tests__/` following the existing directory structure.
- Mock API calls; do not make real network requests in tests.

### Backend

```bash
cd clinicalvision_backend
pytest tests/ -v
```

- Write tests using pytest.
- Use fixtures for database sessions and test clients.
- Test both success and error paths.

---

## Commit Messages

Use clear, descriptive commit messages:

```
type(scope): brief description

Detailed explanation if necessary.
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`, `perf`.

Examples:
- `feat(workflow): add bilateral image upload support`
- `fix(fairness): correct demographic parity calculation`
- `test(auth): add token refresh retry tests`
- `docs(readme): update deployment instructions`

---

## Pull Request Process

1. Ensure all tests pass locally before submitting.
2. Update documentation if your change affects public APIs or user-facing behavior.
3. Fill out the pull request template completely.
4. Request review from at least one maintainer.
5. Address all review comments before merging.

---

## Reporting Issues

Use the GitHub issue templates for:
- **Bug reports**: Include steps to reproduce, expected behavior, and environment details.
- **Feature requests**: Describe the use case, proposed solution, and any alternatives considered.

---

## Medical Software Considerations

ClinicalVision is intended for clinical decision support. When contributing:

- Do not remove or weaken uncertainty quantification in AI outputs.
- Maintain clear separation between AI suggestions and clinical decisions.
- Preserve audit logging for all diagnostic-relevant operations.
- Do not hardcode or fabricate clinical metrics; use clearly labeled demonstration data when real data is unavailable.
- Test edge cases relevant to patient safety (empty inputs, malformed data, boundary conditions).
