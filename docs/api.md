# OfferOS REST API Design

## Contract Goals

The API is the stable boundary for the Next.js application, Chrome extension, workers, and future integrations. It is resource-oriented, versioned, JSON-based, and described by FastAPI-generated OpenAPI.

Base URL:

```text
https://api.offeros.com/api/v1
```

The FastAPI backend implements the current MVP subset of this contract. Future resources in this document remain architectural guidance until implemented.

## Coding Practice Intelligence

Coding practice is intentionally manual-first. OfferOS may save a public LeetCode username and profile URL, but it does not scrape LeetCode, call private or undocumented endpoints, or accept passwords, cookies, sessions, or CSRF tokens. The profile sync endpoint returns an explicit `unsupported` status; the activity history is populated by the authenticated user through logging or CSV import.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prep/coding-profile/connect` | Save a validated public username |
| GET/DELETE | `/prep/coding-profile` | Read or remove the profile link |
| POST | `/prep/coding-profile/sync` | Return safe unsupported-sync status |
| GET/POST | `/prep/coding-activities` | List/filter or create manual activity |
| PATCH/DELETE | `/prep/coding-activities/{id}` | Edit or soft-delete one activity |
| POST | `/prep/coding-activities/import` | Import up to 1,000 user-provided rows |
| GET | `/prep/coding-summary` | Totals, difficulty breakdown, streak, topics, and weekly progress |
| POST | `/prep/coding-goal` | Save a weekly coding target |

CSV imports use `rows` of the standard coding activity write shape. The web client accepts `title`, `url`, `difficulty`, `topics`, `status`, `date`, `time_spent_minutes`, and `notes`, then maps it to this API shape. Duplicate activities are detected by normalized title and solved/attempted date.

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
| POST | `/workspace/reset` | Reset scoped authenticated workspace data to sample or empty state |
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
| POST | `/resumes/{resume_id}/upload` | Upload PDF/DOCX/TXT resume, extract text, and update the owned resume |
| POST | `/resumes/{resume_id}/analyze` | Analyze a stored or pasted resume against a SWE target role |
| GET | `/resumes/{resume_id}/analyses` | List analysis history for one owned resume |
| GET | `/resume-analyses/{analysis_id}` | Read one owned analysis |
| DELETE | `/resume-analyses/{analysis_id}` | Delete one owned analysis |

Current upload handling processes files through FastAPI in memory. Supported formats are PDF, DOCX, and TXT up to 5 MB. The backend validates extension, MIME hints, non-empty content, and file signatures for PDF/DOCX, then stores extracted text and the original filename in PostgreSQL. Permanent file bytes are not stored in this phase. Scanned/image-only PDFs return a clear OCR-not-available-yet validation error.

Upload request:

```http
POST /api/v1/resumes/{resume_id}/upload
Content-Type: multipart/form-data
```

Field: `file`.

Upload response:

```json
{
  "data": {
    "resume": {
      "id": "0195f...",
      "original_file_name": "backend-resume.pdf",
      "text_extraction_status": "parsed",
      "extraction_character_count": 8421
    },
    "extraction": {
      "page_count": 1,
      "character_count": 8421,
      "status": "completed",
      "warnings": []
    }
  }
}
```

### Resume Analysis

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/resumes/{resume_id}/analyze` | Run role-fit analysis for an owned resume |
| GET | `/resumes/{resume_id}/analyses` | List analyses for an owned resume |
| GET | `/resume-analyses/{analysis_id}` | Read status/result |
| DELETE | `/resume-analyses/{analysis_id}` | Remove user-visible result |
| GET | `/ai/status` | Read backend AI provider availability without exposing secrets |

Request:

```json
{
  "target_role": "Backend Software Engineer Intern",
  "company_name": "Acme",
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
    "experience_match_score": 76,
    "required_skills_match": [
      {
        "skill": "FastAPI",
        "status": "strong",
        "evidence": "FastAPI services"
      }
    ],
    "preferred_skills_match": [
      {
        "skill": "Kubernetes",
        "status": "missing",
        "evidence": null
      }
    ],
    "missing_keywords": ["contract testing"],
    "strong_keywords": ["FastAPI", "PostgreSQL"],
    "weak_bullets": [
      {
        "original": "Built backend APIs",
        "issue": "The bullet lacks scope and measurable impact.",
        "suggestion": "Add technologies, ownership, and quantified result."
      }
    ],
    "suggested_bullet_rewrites": [
      {
        "original": "Built backend APIs",
        "rewrite": "Built FastAPI services backed by PostgreSQL, reducing API latency by 35%.",
        "why_better": "It shows technical depth and measurable impact.",
        "grounded_in_resume": true
      }
    ],
    "strengths": [],
    "risks": [],
    "recommendations": [],
    "recruiter_summary": "Concise recruiter-facing role-fit summary.",
    "summary": "Concise role-fit summary."
  }
}
```

The endpoint returns `200` with a stored analysis. If neither `resume_text` nor stored `extracted_text` exists, or if the job description is too short for job-specific matching, the API returns `422`. OpenRouter calls happen only on the backend; clients never send provider API keys.

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
  "mode": "sample"
}
```

`scope` is one of `all`, `applications`, `resumes`, or `prep`. `mode` is `sample` or `empty`. The server derives the user from the Clerk token, deletes existing rows for only that user and scope, recreates server-owned sample records only when `mode` is `sample`, and returns normalized deleted/created counts. The legacy `demo` mode is accepted as an alias for older clients. Settings clear actions use `mode=empty`. It is intentionally not a cross-user admin operation.

Example response:

```json
{
  "scope": "all",
  "mode": "sample",
  "deleted": {
    "applications": 4,
    "resumes": 2,
    "coding": 5,
    "behavioral": 4,
    "systemDesign": 3,
    "resumeAnalyses": 1
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
- Uploaded resume files use extension checks, MIME hints, size limits, non-empty checks, and file signature validation where practical. This phase does not include malware scanning or permanent private file storage.
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
