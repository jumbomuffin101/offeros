# OfferOS REST API Design

## Contract Goals

The API is the stable boundary for the Next.js application, Chrome extension, workers, and future integrations. It is resource-oriented, versioned, JSON-based, and described by FastAPI-generated OpenAPI.

Base URL:

```text
https://api.offeros.com/api/v1
```

The FastAPI backend implements the current MVP subset of this contract. Future resources in this document remain architectural guidance until implemented.

## Standards

### Authentication

All endpoints require a valid Clerk bearer token unless marked public.

```http
Authorization: Bearer <clerk-session-jwt>
```

The authenticated user is derived from the token subject, never from a client-provided `user_id`. Admin/support endpoints require server-side role checks and audit logging.

### Media Types and Naming

- Request and response bodies use `application/json`.
- JSON fields use `snake_case` at the API boundary. The generated TypeScript client may map names if desired, but one convention should be used consistently.
- The frontend API repositories map snake_case payloads and lowercase API enums into the existing camelCase OfferOS domain types.
- Successful endpoints return `{ "data": ... }`; deletes return `204 No Content`.
- `NEXT_PUBLIC_DATA_MODE=local` selects localStorage repositories. `NEXT_PUBLIC_DATA_MODE=api` selects authenticated FastAPI repositories without changing UI hooks.
- Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC.
- IDs are opaque UUID strings.
- Missing optional fields and explicit `null` have different PATCH semantics.

### Response Envelopes

Single resource:

```json
{
  "data": {
    "id": "0195f97a-2ff6-7f2a-b084-cf87c5149526",
    "company": { "id": "0195f978-...", "name": "Acme" },
    "role_title": "Software Engineer Intern",
    "status": "oa",
    "updated_at": "2026-07-03T14:30:00Z",
    "version": 3
  },
  "meta": { "request_id": "req_01J..." }
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "request_id": "req_01J...",
    "next_cursor": null,
    "has_more": false
  }
}
```

Error format:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request contains invalid fields.",
    "fields": {
      "deadline": ["Deadline cannot be before the applied date."]
    }
  },
  "meta": { "request_id": "req_01J..." }
}
```

### HTTP Semantics

| Operation | Success |
| --- | --- |
| Create | `201 Created` with resource and `Location` header |
| Read/list | `200 OK` |
| Async command | `202 Accepted` with job/request resource |
| Update | `200 OK` with updated resource |
| Delete | `204 No Content` for idempotent soft deletion |

Common failures: `400` malformed request, `401` missing/invalid identity, `403` insufficient role, `404` absent or not owned, `409` conflict/idempotency mismatch, `412` version conflict, `422` semantic validation, `429` rate limit, `500` internal failure.

### Pagination, Filtering, and Sorting

- Cursor pagination: `?limit=50&cursor=<opaque>`; maximum 100.
- Filters are explicit query parameters, for example `status=interview&priority=high`.
- Sort uses a bounded allowlist, for example `sort=-updated_at`.
- Search uses `q`; no arbitrary SQL-like filter language.
- Deleted records are excluded unless an authorized recovery endpoint explicitly requests them.

### Idempotency and Concurrency

Create and command endpoints accept:

```http
Idempotency-Key: <client-generated-uuid>
```

The server stores the key, authenticated user, normalized request hash, response status, and resource ID. Reusing a key with a different payload returns `409`.

PATCH requests send either `If-Match: "<version>"` or a body `version`. A stale version returns `412 precondition_failed` with the current version.

## Resource Endpoints

### Users

Identity lifecycle is primarily synchronized from Clerk webhooks.

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/users/me` | Current account and onboarding state | User |
| PATCH | `/users/me` | Limited account preferences such as display email | User |
| POST | `/users/me/export` | Queue portable data export | User |
| DELETE | `/users/me` | Schedule privacy-safe account deletion | User + recent auth |
| POST | `/internal/clerk/webhooks` | Clerk user lifecycle synchronization | Signed webhook |

Example:

```json
{
  "data": {
    "id": "0195f...",
    "status": "active",
    "role": "user",
    "primary_email": "student@example.com",
    "onboarding_completed": true
  }
}
```

### Profiles

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/profile` | Read recruiting profile |
| PUT | `/profile` | Create or replace profile |
| PATCH | `/profile` | Update selected fields |

Validation: graduation year range, URL schemes, bounded role/location arrays, timezone from the IANA database. Work authorization data is sensitive and should not be returned to analytics tools.

### Companies

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/companies` | Search canonical companies | User |
| GET | `/companies/{company_id}` | Company summary | User |
| POST | `/companies` | Suggest/create company when no match exists | User |
| PATCH | `/admin/companies/{company_id}` | Verify/merge metadata | Admin |

Company creation normalizes name/domain and may return an existing canonical match.

### Applications

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/applications` | Create application |
| GET | `/applications` | List/filter pipeline |
| GET | `/applications/{application_id}` | Read one application |
| PATCH | `/applications/{application_id}` | Partial update or status transition |
| DELETE | `/applications/{application_id}` | Soft delete |
| POST | `/workspace/reset` | Reset scoped authenticated workspace data to demo or empty state |
| POST | `/applications/{application_id}/restore` | Restore during retention window |
| GET | `/applications/{application_id}/activity` | Status/update history |

Create request:

```json
{
  "company": { "name": "Acme", "website_domain": "acme.example" },
  "role_title": "Backend Engineering Intern",
  "location": "New York, NY",
  "status": "applied",
  "priority": "high",
  "applied_on": "2026-07-03",
  "deadline": "2026-07-20",
  "source": "company_site",
  "job_url": "https://acme.example/jobs/123",
  "resume_version_id": "0195f...",
  "tags": ["backend", "internship"],
  "notes": "Referral submitted."
}
```

PATCH request:

```json
{
  "status": "interview",
  "deadline": "2026-07-12",
  "version": 2
}
```

Validation: ownership of referenced resume version, allowed state/date combinations, URL length and scheme, email normalization, bounded notes/tags, and no client-controlled company verification.

### Resumes and Versions

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/resumes` | Create logical resume |
| GET | `/resumes` | List resume families |
| GET | `/resumes/{resume_id}` | Resume with version summary |
| PATCH | `/resumes/{resume_id}` | Rename/archive/update targeting |
| DELETE | `/resumes/{resume_id}` | Soft delete when references permit |
| POST | `/resumes/{resume_id}/analyze` | Analyze a stored or pasted resume against a SWE target role |
| GET | `/resumes/{resume_id}/analyses` | List analysis history for one owned resume |
| POST | `/resumes/{resume_id}/versions/upload-url` | Create signed upload intent |
| POST | `/resumes/{resume_id}/versions` | Finalize uploaded version metadata |
| GET | `/resumes/{resume_id}/versions` | List immutable versions |
| GET | `/resume-versions/{version_id}` | Version metadata/extraction status |
| POST | `/resume-versions/{version_id}/download-url` | Short-lived signed download URL |
| DELETE | `/resume-versions/{version_id}` | Schedule version deletion |

Upload is two-step so file bytes go directly to private object storage rather than through FastAPI. Finalization validates storage key ownership, MIME type, size, checksum, and upload intent expiry, then queues scanning/extraction.

Current MVP stores manual resume text on the resume version. PDF/DOCX parsing is not implemented yet; users paste plain text into `extracted_text` or provide `resume_text` in the analysis request.

Finalize request:

```json
{
  "upload_intent_id": "0195f...",
  "original_filename": "backend-resume.pdf",
  "mime_type": "application/pdf",
  "byte_size": 184220,
  "checksum_sha256": "8de..."
}
```

### Resume Analysis

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/resumes/{resume_id}/analyze` | Run role-fit analysis for an owned resume |
| GET | `/resumes/{resume_id}/analyses` | List analyses for an owned resume |
| GET | `/resume-analyses/{analysis_id}` | Read status/result |
| DELETE | `/resume-analyses/{analysis_id}` | Remove user-visible result |

Request:

```json
{
  "target_role": "Backend Software Engineer Intern",
  "job_description": "Python, FastAPI, PostgreSQL, distributed systems...",
  "resume_text": "Optional override. If omitted, stored extracted_text is used."
}
```

Response:

```json
{
  "data": {
    "id": "01960...",
    "status": "completed",
    "overall_score": 84,
    "keyword_score": 78,
    "impact_score": 88,
    "clarity_score": 82,
    "technical_depth_score": 80,
    "missing_keywords": ["contract testing"],
    "strong_keywords": ["FastAPI", "PostgreSQL"],
    "weak_bullets": [],
    "suggested_bullet_rewrites": [],
    "strengths": [],
    "risks": [],
    "recommendations": [],
    "summary": "Concise role-fit summary."
  }
}
```

The endpoint returns `200` with a stored analysis. If neither `resume_text` nor stored `extracted_text` exists, the API returns `422`. OpenAI calls happen only on the backend; clients never send provider API keys.

### Coding Prep

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prep/coding-problems` | Add problem |
| GET | `/prep/coding-problems` | List/filter problems |
| GET | `/prep/coding-problems/{id}` | Read problem |
| PATCH | `/prep/coding-problems/{id}` | Update content/status |
| DELETE | `/prep/coding-problems/{id}` | Soft delete |

Request fields: title, difficulty, topic, target minutes, status, notes, problem URL, platform/external ID. Validation includes positive target time and supported status transitions.

### Behavioral Stories

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prep/behavioral-stories` | Create reusable STAR story |
| GET | `/prep/behavioral-stories` | List/filter by category/company/status |
| GET | `/prep/behavioral-stories/{id}` | Read story |
| PATCH | `/prep/behavioral-stories/{id}` | Edit STAR fields/confidence/status |
| DELETE | `/prep/behavioral-stories/{id}` | Soft delete |

Example:

```json
{
  "question": "Tell me about a difficult technical problem.",
  "category": "problem_solving",
  "company_context": "Acme",
  "star": {
    "situation": "A data import timed out at scale.",
    "task": "Restore reliability before launch.",
    "action": "Profiled and batched repeated lookups.",
    "result": "Runtime fell by 68 percent."
  },
  "confidence_score": 4,
  "status": "in_progress"
}
```

### System Design Prep

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prep/system-design-prompts` | Add prompt |
| GET | `/prep/system-design-prompts` | List prompts |
| GET | `/prep/system-design-prompts/{id}` | Read prompt |
| PATCH | `/prep/system-design-prompts/{id}` | Update prompt/concepts/notes/status |
| DELETE | `/prep/system-design-prompts/{id}` | Soft delete |

### Prep Sessions and Goals

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prep/sessions` | Record practice session |
| GET | `/prep/sessions` | List sessions by period/type |
| GET | `/prep/summary` | Current streak and weekly totals |
| POST | `/goals` | Create goal |
| GET | `/goals` | List current/history |
| PATCH | `/goals/{goal_id}` | Update target/effective period |
| DELETE | `/goals/{goal_id}` | Retire goal |

Session creation is idempotent because offline clients may retry. Goal progress is computed from source events; clients cannot PATCH current progress.

### Analytics

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/analytics/overview` | Current KPI aggregate |
| GET | `/analytics/applications` | Trends, status and conversion funnels |
| GET | `/analytics/prep` | Completion trend, streak, goal progress |
| GET | `/analytics/resumes` | Usage and analysis summary |
| GET | `/analytics/snapshots` | Historical snapshots |

Parameters include `from`, `to`, and timezone. The service reads authoritative rows for short ranges and snapshots for longer ranges. Analytics endpoints never expose another user's aggregate.

### Notifications

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/notifications` | List in-app notifications |
| PATCH | `/notifications/{id}` | Mark read/unread |
| POST | `/notifications/read-all` | Mark visible set read |
| DELETE | `/notifications/{id}` | Dismiss notification |
| GET | `/notification-preferences` | Read preferences |
| PATCH | `/notification-preferences` | Update channels/quiet hours |

Clients cannot create arbitrary provider notifications. Product services emit domain events and the notification subsystem decides delivery.

### Settings

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/settings` | Read user settings |
| PATCH | `/settings` | Update supported settings |

Validation uses a strict allowlist. Security roles, Clerk identity, and AI usage limits are not mutable through this endpoint.

### Workspace Commands

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/workspace/reset` | Transactionally reset scoped user-owned workspace rows |

Current request shape:

```json
{
  "scope": "all",
  "mode": "demo"
}
```

`scope` is one of `all`, `applications`, `resumes`, or `prep`. `mode` is `demo` or `empty`. The server derives the user from the Clerk token, deletes existing rows for only that user and scope, recreates server-owned demo records only when `mode` is `demo`, and returns normalized deleted/created counts. This endpoint powers API-mode demo reset buttons, Start Fresh, and Settings reset actions. It is intentionally not a cross-user admin operation.

Example response:

```json
{
  "scope": "all",
  "mode": "demo",
  "deleted": {
    "applications": 4,
    "resumes": 2,
    "coding": 5,
    "behavioral": 4,
    "systemDesign": 3,
    "analyses": 1
  },
  "created": {
    "applications": 4,
    "resumes": 2,
    "coding": 5,
    "behavioral": 4,
    "systemDesign": 3
  }
}
```

### Saved Jobs

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/saved-jobs` | Save opportunity manually |
| GET | `/saved-jobs` | List/filter saved jobs |
| GET | `/saved-jobs/{id}` | Read saved job |
| PATCH | `/saved-jobs/{id}` | Edit/dismiss |
| DELETE | `/saved-jobs/{id}` | Soft delete |
| POST | `/saved-jobs/{id}/convert` | Convert idempotently to application |

Conversion creates an application and marks the saved job converted in one transaction.

### Chrome Extension Imports

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/extension/imports` | Submit parsed job payload |
| GET | `/extension/imports/{id}` | Read processing result |
| GET | `/extension/status` | Auth/install compatibility check |

The import request includes source site/URL, parser version, extension installation ID, and normalized candidate fields. Payload size is bounded. HTML and scripts are rejected or sanitized; the server never trusts extension-parsed company or job identifiers without normalization.

### Future AI Requests

The resource-specific endpoints above should be preferred. A generic operational endpoint supports status and cancellation:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/ai/requests/{request_id}` | Status, cost-safe metadata, result link |
| POST | `/ai/requests/{request_id}/cancel` | Best-effort cancellation before execution |
| GET | `/ai/usage` | User feature usage and limits |

Future feature commands:

- `POST /resume-analyses`
- `POST /ai/job-matches`
- `POST /ai/behavioral-feedback`
- `POST /ai/system-design-reviews`
- `POST /ai/mock-interviews`

Each returns `202` and an AI request ID. Inputs reference stored, authorized resources rather than accepting arbitrary hidden user IDs.

## Public and Operational Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/live` | Process liveness; no dependency checks |
| GET | `/health/ready` | Database/required dependency readiness |
| GET | `/version` | Build identifier and API version |
| POST | `/internal/clerk/webhooks` | Clerk-signed lifecycle events |

OpenAPI documentation should be disabled or protected in production unless an intentionally public developer API is launched.

## Validation and Security Notes

- Every repository query includes authenticated ownership scope.
- Return `404`, not `403`, for resources the user does not own to reduce enumeration.
- Pydantic rejects unknown fields on write schemas.
- Strings have explicit length limits; URLs and emails are normalized.
- Uploaded files use MIME sniffing, extension checks, size limits, malware scanning, and private storage.
- User-provided Markdown/HTML is stored as text and escaped on render.
- Rate limits apply by user, IP risk signal, route class, and AI budget.
- Clerk webhook signatures and replay windows are verified before processing.
- Sensitive values never appear in logs, analytics events, or error details.

## Contract Evolution

- Breaking changes create `/v2`; additive fields remain in `/v1`.
- Response consumers ignore unknown fields.
- Deprecations include headers and a published removal date.
- OpenAPI is checked into CI as an artifact; generated TypeScript clients fail CI on unreviewed breaking changes.
- API examples in this document become contract-test fixtures during implementation.
