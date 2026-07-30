# Production Smoke Test

Use a dedicated disposable Clerk account for destructive checks.

## Public

- Open landing page, `/privacy`, `/terms`, and `/sign-in`.
- Verify `GET /api/v1/health` is fast/public and `/api/v1/ready` reports ready.

## Authenticated

- Open Dashboard, Applications, Resumes, Prep, Inbox, Notifications, and Settings.
- Create an application and confirm refresh persistence.
- Upload a small resume, confirm extraction, and run one analysis.
- Generate one application prep plan and mark one notification read.
- Export JSON; verify `schema_version`, `generated_at`, and user-only records.
- Open and cancel deletion. Do not delete the primary production test account.

## Monitoring

- Confirm no new server/client errors, failed migrations, repeated 401s, or sensitive payloads in logs.
- Record cold/warm latency and request IDs for failed or slow operations.

## Career Intelligence Phase 1 and Phase 2

Release record:

- Source commit: record after the verification commit is pushed.
- GitHub Actions run: record the successful run URL.
- Render commit: confirm it matches the source commit.
- Vercel commit: confirm it matches the source commit.
- Alembic revision: `20260730_0018`.
- Phase 3 status: not started.

Backend:

- Confirm PostgreSQL upgrades from `20260727_0017` to `20260730_0018` and preserves a pre-existing user.
- Confirm `career_observations` has user/status, user/type/confirmed, unique user/key, and user indexes.
- Confirm observation JSON defaults, valid-status constraint, and user foreign-key cascade.
- Confirm OpenAPI lists `/career-intelligence/context`, `/health`, `/observations`,
  `/recommendations`, and `/trends`.
- Confirm unauthenticated requests return readable `401` responses with request IDs.
- For an authenticated disposable account, confirm all five endpoints return `200`.
- Inspect only safe summaries. Public context must exclude user IDs, raw resume text, job
  descriptions, application notes, Gmail bodies/excerpts, prompts, tokens, and cache payloads.

Consumers:

- Today renders honest insufficient-data and ready Career Health states, at most five priorities,
  and scoped partial failure without collapsing the core workspace.
- Smart Inbox uses stable recommendation keys without duplicate cards; verify snooze, dismiss,
  and deep links for representative stale application, deadline, and missing-prep signals.
- Recruiter Copilot retains its response contract and receives only the target application,
  sanitized intelligence summary, relevant observations, and concise recommendations.
- Treat job descriptions and email-derived strings as untrusted data; do not inspect or record the
  assembled prompt.

Cache and lifecycle:

- Repeat a context request to exercise the short per-user cache, then mutate an application,
  timeline event, Gmail suggestion, weekly goal, and observation to confirm invalidation.
- Confirm cache failures fall back to a fresh build and no cross-user result is returned.
- Confirm repeated evidence updates one observation, dismissed observations remain dismissed, and
  resolved or expired observations are not active.
- Export a disposable account and verify safe observations are included without internal context.
- Delete that account and confirm observations are removed by cascade and deletion is idempotent.

## Gmail

- Connect a dedicated test account and verify Google requests read-only Gmail access.
- Run sync, accept one suggestion, and verify the timeline event survives refresh.
- Confirm a second sync creates no duplicate, then disconnect and verify sync is disabled.
- Delete Gmail-derived data and verify accepted application events remain.
- Inspect export, Render logs, and Sentry for OAuth codes, tokens, raw bodies, excerpts, and prompts;
  none may be present.

## Release Verification

Run before promoting a release:

- `npm run lint`
- `npm run build`
- `node --test apps/web/tests/*.test.mjs`
- `cd backend && .venv/Scripts/python.exe -m pytest -q`
- `cd backend && .venv/Scripts/python.exe -m compileall -q app`
- `cd backend && .venv/Scripts/alembic.exe heads`
- `git diff --check`

Inspect the application drawer and notification center at:

- 1536x864
- 1440x900
- 1366x768
- 1280x720
- 1024x768
- 768x1024
- 430x932
- 390x844
- 375x667
- 320x568

At each viewport, confirm the modal/panel remains inside the viewport, only its body scrolls,
footer actions remain reachable, the page has no horizontal overflow, Escape closes the surface,
and focus returns to its trigger. For Career Intelligence, verify the Career Health card and
priorities at 1536x864, 1366x768, 1024x768, 768x1024, 390x844, 375x667, and 320x568. Also verify
Today renders its core workspace when Career Intelligence, notification, or Gmail is unavailable.

`alembic current` requires a reachable PostgreSQL database and a working local `libpq`/psycopg
installation. Run it against the production database as part of deployment when those are not
available in the local QA environment.
