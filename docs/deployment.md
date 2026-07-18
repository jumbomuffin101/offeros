# OfferOS Production Deployment

OfferOS deploys as two services:

- Next.js frontend on Vercel
- Dockerized FastAPI API on Render, Railway, or Fly.io
- PostgreSQL on Neon or another managed PostgreSQL provider

The repository includes a Render Blueprint at `render.yaml`. Railway and Fly.io can use the same `backend/Dockerfile` and `backend/start.sh` without application changes.

## Production Environment

### Backend

```env
APP_ENV=production
DATABASE_URL=
API_V1_PREFIX=/api/v1
AUTH_REQUIRED=true
CLERK_ISSUER=
CLERK_JWKS_URL=
CLERK_AUDIENCE=offeros-api
CORS_ORIGINS=https://your-vercel-url.vercel.app
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AI_TIMEOUT_SECONDS=60
AI_MOCK_ENABLED=false
LOG_LEVEL=INFO
```

`DATABASE_URL` may use a provider-style `postgres://` or `postgresql://` URL. OfferOS normalizes it to the psycopg SQLAlchemy driver. `CORS_ORIGINS` accepts comma-separated origins, so production and preview URLs can be listed together without a wildcard.

### Frontend on Vercel

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url/api/v1
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

Changes to `NEXT_PUBLIC_*` variables require a new Vercel deployment because they are embedded in the frontend build.

## Deploy on Render

1. Create a Neon PostgreSQL database and copy its connection string.
2. In Render, create a Blueprint from this repository. Render reads `render.yaml` at the repository root.
3. Enter the secret environment values requested by the Blueprint: `DATABASE_URL`, `CLERK_ISSUER`, `CLERK_JWKS_URL`, and `CORS_ORIGINS`.
4. Deploy. Render builds `backend/Dockerfile`, runs `alembic upgrade head` as the pre-deploy command, and starts `backend/start.sh`.
5. Confirm `https://your-backend-url/api/v1/health` returns HTTP 200.

The health route is public. User-owned routes require a valid Clerk token when `AUTH_REQUIRED=true`.

## Railway or Fly.io

Use `backend/` as the Docker build context and `backend/Dockerfile` as the Dockerfile. Configure the same backend environment variables and expose the platform-provided `PORT`.

Run this once as the platform release or pre-deploy command:

```bash
alembic upgrade head
```

The production process command is:

```bash
sh ./start.sh
```

Do not run migrations in every web process startup. Use the platform's release phase, pre-deploy command, or a one-off job so concurrent replicas cannot race.

## Database Migration

The initial Alembic migration creates the current production schema:

- `users`
- `applications`
- `resume_versions`
- `coding_problems`
- `behavioral_questions`
- `system_design_prompts`
- `user_settings`

It also creates the analytics snapshot table used by the backend model set. To migrate manually from `backend/`:

```bash
alembic upgrade head
```

Resume Intelligence migrations add extracted text metadata, job-matching analysis fields, and latest-analysis summary fields on `resume_versions`. Always run `alembic upgrade head` after deploying backend code that includes resume upload or analysis schema changes.

Application Resume Intelligence adds `applications.resume_version_id`,
`applications.resume_analysis_id`, and `applications.job_description`. The migration
links an application to a saved resume and its exact role-specific analysis without
copying resume data into the application row. Run `alembic upgrade head` before
deploying the corresponding API and frontend changes.

For Neon, use a direct connection for migration jobs when available. The pooled connection is appropriate for API runtime traffic.

### Recover from a missing-column error

An error such as `UndefinedColumn: column resume_versions.last_analyzed_at does not exist`
means the API image is newer than the Neon schema. Do not change the API query or add
runtime writes to work around it. Run the existing migration chain once against the
same production `DATABASE_URL`:

```bash
cd backend
alembic current
alembic upgrade head
alembic current
```

On Render, run `alembic upgrade head` from a one-off shell in the backend working
directory, then redeploy. Verify the configured service uses the repository-root
`render.yaml` pre-deploy command so future deploys apply revisions before the web
process starts.

## Clerk JWT Template

In the Clerk Dashboard, select the production instance, open **JWT templates**, and create a blank template named `offeros-api` with these claims:

```json
{
  "aud": "offeros-api",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.full_name}}"
}
```

Clerk includes `sub`, `iss`, `iat`, `nbf`, and `exp` automatically. Do not add or override those claims.

- `CLERK_ISSUER`: the exact `iss` value in a token issued by the production Clerk instance.
- `CLERK_JWKS_URL`: the production Clerk Frontend API URL with `/.well-known/jwks.json` appended. The Clerk API Keys page also exposes the instance JWT public key details.
- `CLERK_AUDIENCE`: `offeros-api`, matching the template's `aud` claim.

Set `NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api` in Vercel so the frontend requests this token. Keep template lifetimes short; Clerk's SDK refreshes tokens as needed.

## Health and Smoke Tests

The unauthenticated health response is:

```json
{
  "status": "ok",
  "environment": "production",
  "service": "offeros-api",
  "version": "0.1.0"
}
```

Run the standard-library smoke script after deployment:

```bash
python backend/scripts/smoke_test.py \
  --base-url https://your-backend-url/api/v1 \
  --auth-required
```

To test the authenticated applications endpoint, obtain a short-lived `offeros-api` token from a signed-in production session and set it only for the current shell:

```bash
export OFFEROS_SMOKE_TOKEN='<short-lived-token>'
python backend/scripts/smoke_test.py \
  --base-url https://your-backend-url/api/v1 \
  --auth-required
```

PowerShell equivalent:

```powershell
$env:OFFEROS_SMOKE_TOKEN = '<short-lived-token>'
python backend/scripts/smoke_test.py --base-url https://your-backend-url/api/v1 --auth-required
Remove-Item Env:OFFEROS_SMOKE_TOKEN
```

The script verifies public health, verifies that an anonymous protected request returns 401, and tests authenticated application listing when a token is present.

## Frontend Failure Behavior

API mode keeps the authenticated application shell mounted when the API cannot be reached. Data views render a friendly error state with a retry action, and account controls remain available so the user can log out. Expired sessions show a reauthentication action. Requests time out instead of hanging indefinitely. `NEXT_PUBLIC_DATA_MODE=local` remains independent of the backend.

## Reset and Import QA

In local mode, reset behavior remains browser-local:

- Application, Resume, and Prep data can be cleared from Settings.
- Settings clear actions remove the selected local records.
- Reset all local data clears OfferOS local keys and restarts onboarding.

In API mode, reset behavior is cloud-scoped:

- Application, Resume, Prep, and Settings reset actions call `POST /api/v1/workspace/reset`.
- Settings clear actions use `{ "scope": "all" | "applications" | "resumes" | "prep", "mode": "empty" }`.
- Optional sample workspace loading uses `{ "scope": "all", "mode": "sample" }`.
- The backend deletes only the authenticated user's rows for the selected scope.
- `mode=sample` recreates server-owned sample records. `mode=empty` leaves the selected scope empty, which is what Start Fresh and Settings clears use.
- Resume resets also delete that user's resume analysis rows.
- Repeating sample loading should leave one copy of the sample records, not duplicates.
- Dashboard and Analytics should update after the reset because repository hooks listen for the shared data-change event and refetch from the API.

Manual local import:

- If the same browser still has localStorage records while `NEXT_PUBLIC_DATA_MODE=api`, Settings shows **Import local workspace**.
- Import is one-click, never automatic, and skips likely duplicate applications, resumes, and prep items.
- Use this only after signing into the intended account.

Troubleshooting:

- `401`: verify the user is signed in, `NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api`, and the backend `CLERK_AUDIENCE` matches.
- `403`: verify the token audience and route permissions.
- `422`: inspect the response `error.details` for invalid fields, usually a URL/email or length validation issue.
- `503 ai_not_configured`: set `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, and `AI_MODEL` on the backend, then redeploy.
- Network timeout: verify `NEXT_PUBLIC_API_BASE_URL`, backend health, and CORS origins.
- Reset does not update UI: confirm the frontend was redeployed with `NEXT_PUBLIC_DATA_MODE=api`, then verify the reset response contains the expected `scope`, `mode`, `deleted`, and `created` fields.

Manual reset validation checklist:

1. Sign in to the production Vercel frontend.
2. Create a custom application.
3. Clear applications from Settings.
4. Verify the custom application is gone and the Applications page is empty.
5. Reset all workspace data to empty from Settings or Start Fresh.
6. Verify Dashboard and Analytics show empty states.
7. Load the optional sample workspace from onboarding or a development helper if needed.
8. Refresh the browser.
9. Log out and log back in.
10. Verify cleared data stays empty unless you intentionally loaded sample data.
11. Repeat sample loading twice and confirm there are no duplicate applications, resumes, or prep items.

## AI Resume Intelligence QA

- OpenRouter keys are backend-only. Do not add them to Vercel frontend env vars.
- Local mode uses deterministic mock analysis in browser localStorage.
- Backend local/test mode uses deterministic mock analysis only when `AI_MOCK_ENABLED=true`.
- Production API mode requires `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY`; otherwise the UI shows a setup error.
- Users can upload PDF, DOCX, or TXT resumes up to 5 MB. The backend extracts text in memory and stores extracted text plus the original filename in PostgreSQL. It does not permanently store file bytes.
- Scanned or image-only PDFs return an OCR-not-available-yet validation message. OCR is not implemented yet.
- Users can still paste or edit resume text manually before analysis.
- Job-specific analysis requires a target role and meaningful job description. Scores are heuristic guidance, not ATS guarantees.
- If OpenRouter's configured free model is unavailable, change `AI_MODEL` on the backend and redeploy; no frontend change is required.

## Deployment Checklist

1. Create a Neon PostgreSQL database.
2. Deploy the backend from `backend/Dockerfile` or the Render Blueprint.
3. Set all backend environment variables.
4. Run `alembic upgrade head`.
5. Configure the Clerk JWT template named `offeros-api`.
6. Add the backend API URL to Vercel as `NEXT_PUBLIC_API_BASE_URL`.
7. Set `NEXT_PUBLIC_DATA_MODE=api` and `NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api`.
8. Redeploy the Vercel frontend.
9. Test production sign-in.
10. Create an application and confirm it appears in the list.
11. Refresh and confirm the application persists.
12. Test the explicit Log out action and sign-in redirect.
13. Clear Applications and confirm the list remains empty after refresh.
14. Reset all cloud data from Settings and confirm Dashboard and Analytics update after refresh/refetch.
15. Paste resume text, run AI Resume Analysis, refresh, and confirm analysis history persists.
16. Upload a PDF or DOCX resume, verify extraction reaches **Ready for analysis**, paste a target job description, run analysis, and reopen the previous result from history.
17. Run `alembic upgrade head` after deploying coding practice intelligence, then connect a public LeetCode username, log a problem, and confirm `/api/v1/prep/coding-summary` reflects it. Automatic LeetCode sync is intentionally unavailable.

## Rollback

Switching Vercel back to `NEXT_PUBLIC_DATA_MODE=local` and redeploying restores browser-local operation without deleting API data. Backend rollbacks should redeploy the previous image. Avoid destructive database downgrades; apply forward-compatible corrective migrations instead.
