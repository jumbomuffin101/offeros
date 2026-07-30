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
and focus returns to its trigger. Also verify Today renders its core workspace when an optional
notification or Gmail section is unavailable.

`alembic current` requires a reachable PostgreSQL database and a working local `libpq`/psycopg
installation. Run it against the production database as part of deployment when those are not
available in the local QA environment.
