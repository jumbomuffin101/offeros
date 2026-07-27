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
