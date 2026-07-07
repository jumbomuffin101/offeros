# OfferOS Backend

FastAPI foundation for the OfferOS technical recruiting workspace. The Next.js frontend uses it when `NEXT_PUBLIC_DATA_MODE=api`; localStorage mode remains the frontend default.

## Stack

- Python 3.12
- FastAPI and Pydantic
- SQLAlchemy 2.x
- Alembic
- PostgreSQL via psycopg 3
- pytest
- Docker

Authentication is implemented through Clerk JWT verification in `app/core/auth.py`. `AUTH_REQUIRED=false` keeps the deterministic demo user for local development and existing tests. `AUTH_REQUIRED=true` requires a valid Clerk bearer token and finds or creates a local user by Clerk subject.

## Local Setup

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

macOS/Linux activation:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

Apply migrations:

```bash
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Endpoints:

- Root: `http://localhost:8000/`
- Health: `http://localhost:8000/api/v1/health`
- OpenAPI UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Docker Compose

Run PostgreSQL, migrations, and the development API together:

```bash
docker compose up --build
```

The compose setup is for local development. Production runs migrations as a separate release job and does not use `--reload`.

## Production Deployment

The repository-root `render.yaml` is the reference deployment for Render. It builds this directory's Dockerfile, runs `alembic upgrade head` as a pre-deploy command, checks `/api/v1/health`, and starts the API through `start.sh`.

Railway and Fly.io can use the same image. Use `backend/` as the Docker build context, run `alembic upgrade head` as the platform release command, and start the web service with:

```bash
sh ./start.sh
```

`start.sh` binds to `0.0.0.0`, honors the platform-provided `PORT`, and enables proxy headers. Migrations are deliberately separate from web process startup.

Required production values:

```env
APP_ENV=production
DATABASE_URL=
API_V1_PREFIX=/api/v1
AUTH_REQUIRED=true
CLERK_ISSUER=
CLERK_JWKS_URL=
CLERK_AUDIENCE=offeros-api
CORS_ORIGINS=https://your-vercel-url.vercel.app
AI_PROVIDER=openai
OPENAI_API_KEY=
AI_MODEL=gpt-4.1-mini
LOG_LEVEL=INFO
```

Provider URLs beginning with `postgres://` or `postgresql://` are normalized to SQLAlchemy's psycopg driver automatically. See `../docs/deployment.md` for the complete Render, Clerk, Vercel, and smoke-test procedure.

## Tests

Tests use an isolated in-memory SQLite database through FastAPI dependency overrides, so PostgreSQL is not required:

```bash
pytest
```

The suite verifies app startup, health, application create/list, and workspace reset replacement behavior.

After deployment, run the dependency-free smoke test:

```bash
python scripts/smoke_test.py \
  --base-url https://your-backend-url/api/v1 \
  --auth-required
```

Set `OFFEROS_SMOKE_TOKEN` to a short-lived `offeros-api` Clerk token to also verify authenticated application listing.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | `local`, `test`, `staging`, or `production` |
| `API_V1_PREFIX` | Versioned route prefix; defaults to `/api/v1` |
| `DATABASE_URL` | SQLAlchemy database URL |
| `CORS_ORIGINS` | Comma-separated origins or a JSON array; include local and deployed frontend URLs |
| `CLERK_ISSUER` | Expected Clerk token issuer |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint used by the cached signing-key client |
| `CLERK_AUDIENCE` | Expected API token audience; optional only while auth is disabled |
| `AUTH_REQUIRED` | Require valid Clerk JWTs when `true`; defaults to `false` |
| `AI_PROVIDER` | `openai` for production resume analysis, `disabled` or blank for no configured provider |
| `OPENAI_API_KEY` | Server-side OpenAI API key; never exposed to the frontend |
| `AI_MODEL` | OpenAI model used by Resume Intelligence |
| `LOG_LEVEL` | Python logging level |

The public `GET /api/v1/health` route returns `status`, `environment`, `service`, and `version`. It never requires authentication and is suitable for platform health checks.

## Workspace Reset

`POST /api/v1/workspace/reset` is the API-mode reset command used by the frontend. It requires the current user dependency when `AUTH_REQUIRED=true`.

Behavior:

- `scope=applications`, `resumes`, `prep`, or `all` selects which user-owned tables are replaced.
- `mode=demo` recreates server-owned demo records after deletion.
- `mode=empty` leaves the selected workspace area empty after deletion.
- Existing rows for the authenticated user and scope are deleted in the same transaction that optionally recreates demo records.
- Resume resets also delete that user's resume analysis history so orphaned analysis rows are not left behind.
- Other users' rows are never selected or modified.
- Repeating the same reset does not duplicate demo records.
- The endpoint returns normalized deleted/created counts.

The frontend uses this endpoint for page-level demo reset buttons and Settings reset actions in API mode. Local mode continues to use localStorage reset behavior.

## AI Resume Intelligence

Resume versions now store manual resume text fields:

- `extracted_text`
- `original_file_name`
- `text_extraction_status`
- `text_extraction_error`

PDF/DOCX parsing is intentionally a TODO. Users paste plain resume text in the web app today.

Analysis endpoints:

- `POST /api/v1/resumes/{resume_id}/analyze`
- `GET /api/v1/resumes/{resume_id}/analyses`
- `GET /api/v1/resume-analyses/{analysis_id}`
- `DELETE /api/v1/resume-analyses/{analysis_id}`

All analysis reads and writes are scoped to the current authenticated user. The backend uses `app/services/ai_resume_analysis.py` as the provider boundary. `AI_PROVIDER=openai` with `OPENAI_API_KEY` calls OpenAI from the backend using strict JSON output. Local and test environments fall back to deterministic mock analysis so UI flows and tests do not require external AI access. Production without AI configuration returns a clear `ai_not_configured` error.

## Local Import

When `NEXT_PUBLIC_DATA_MODE=api`, the Settings page can detect existing browser-local OfferOS records and offer a manual import into the signed-in cloud workspace. The client compares simple stable keys, creates only missing records through the existing authenticated APIs, and then refreshes the workspace views. The backend does not read browser localStorage directly.

## Structure

```text
app/
  api/v1/       # HTTP routes and router composition
  core/         # settings, database, Clerk auth/demo fallback, errors
  models/       # SQLAlchemy models
  schemas/      # Pydantic contracts
  repositories/ # ownership-scoped persistence
  services/     # transactions and use-case logic
  tests/        # API tests with dependency overrides
alembic/        # migration environment and revisions
```

## Migration Workflow

After changing SQLAlchemy models:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

Review every autogenerated migration before committing it. Production schema changes should follow the expand/migrate/contract approach documented in `../docs/deployment.md`.

The initial PostgreSQL migration creates `users`, `applications`, `resume_versions`, `coding_problems`, `behavioral_questions`, `system_design_prompts`, `user_settings`, and the current analytics snapshot table.

## Next Steps

1. Add verified Clerk webhook lifecycle synchronization for email/name updates and account deletion.
2. Add an explicit local-to-cloud import flow rather than silently copying localStorage records.
3. Add PostgreSQL integration tests for repositories and Alembic upgrades.
4. Add request IDs, structured JSON logging, pagination, idempotency, and optimistic concurrency.
5. Add private resume object storage only after authenticated ownership exists.

AI, Chrome extension imports, queues, and background workers remain intentionally out of scope.

## Clerk Authentication

The API expects `Authorization: Bearer <token>` only when `AUTH_REQUIRED=true`. Tokens are verified with RS256, issuer, audience, expiration, and subject checks. Clerk signing keys are fetched through `PyJWKClient` and cached for five minutes.

On the first valid authenticated request, the backend creates a user keyed by `clerk_user_id`. Email and name claims are used when present; otherwise a deterministic internal email and neutral display name are used. Concurrent first requests are handled through the unique Clerk ID constraint. Every user-owned service lookup is scoped by this internal user ID.

For unauthenticated local API development:

```env
AUTH_REQUIRED=false
```

For Clerk-authenticated API mode:

```env
AUTH_REQUIRED=true
CLERK_ISSUER=https://your-clerk-domain
CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
CLERK_AUDIENCE=offeros-api
CORS_ORIGINS=http://localhost:3000,https://your-offeros-app.vercel.app
```
