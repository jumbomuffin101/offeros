# OfferOS

OfferOS is a polished, installable recruiting workspace for software engineering students. It brings applications, resume versions, coding prep, behavioral prep, deadlines, and recruiting analytics into one local-first app.

Clerk provides account authentication. The frontend repository factory supports browser-local data by default and an opt-in authenticated FastAPI mode. Local mode remains the safe default and does not cloud-sync records.

## MVP Features

- Dashboard with recruiting KPIs, today's plan, deadlines, activity, and pipeline summary
- Kanban-style application tracker for internship and job opportunities
- Resume manager with targeted versions, keyword scores, and mock insights
- AI Resume Intelligence with PDF/DOCX/TXT ingestion, job-specific role matching, keyword gaps, bullet rewrites, and technical-depth feedback
- Interview prep workspace for coding, behavioral, and system design practice
- LeetCode profile links, manual coding activity logging, CSV import, and weekly coding goals without account scraping
- Analytics page with simple visual indicators for response and conversion trends
- Responsive dark-mode-first shell with desktop sidebar and mobile navigation
- Installable PWA with standalone display, iOS metadata, connection awareness, and basic offline asset caching
- Clerk sign-in/sign-up, protected application routes, and account controls
- Manifest V3 job capture extension for user-initiated Greenhouse, Lever, Ashby, and active-page fallback capture
- Application-specific AI Recruiter Copilot with persistent conversations, quick prompts, and follow-up drafting

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Browser `localStorage`
- Clerk authentication
- shadcn-style local UI primitives
- FastAPI, Pydantic, SQLAlchemy, Alembic, and PostgreSQL-ready backend scaffold

## Run Locally

```bash
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
npm run dev
```

On macOS/Linux, use `cp apps/web/.env.example apps/web/.env.local`. Add the Clerk publishable and secret keys from the Clerk dashboard before starting the app. Sign-in and sign-up are available at `/sign-in` and `/sign-up`; all workspace routes require a session.

### Local Data Mode

Keep the default frontend values:

```env
NEXT_PUBLIC_DATA_MODE=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Applications, resumes, and prep continue using the existing localStorage repositories. The backend is not required.

Resume analysis in local mode uses a deterministic local mock. It is clearly labeled as local/mock and is useful for testing the UX without sending data to an AI provider.

### API Data Mode

Configure a Clerk JWT template whose audience matches `CLERK_AUDIENCE`, then set:

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api
```

Start PostgreSQL and FastAPI as documented in `backend/README.md`. API mode sends a fresh Clerk token with every request. Applications, resumes, and prep tasks use FastAPI; Dashboard and Analytics derive their current UI models from those API-backed lists.

AI Resume Intelligence runs only on the backend. To enable production OpenRouter analysis, set these backend variables:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AI_TIMEOUT_SECONDS=60
AI_MOCK_ENABLED=false
```

Local mode uses deterministic mock analysis without a backend AI key. Backend mock analysis is available only when `AI_MOCK_ENABLED=true` in local/test environments. In production, missing OpenRouter config returns a clear setup error.

In API mode, users can upload PDF, DOCX, or TXT resumes up to 5 MB. FastAPI extracts text server-side, stores only the extracted text and original filename in PostgreSQL, and deletes temporary processing state. Files are not sent directly to OpenRouter and permanent private file storage is intentionally deferred. Manual resume-text paste remains available as a fallback.

The web app lives in `apps/web`. The root workspace scripts forward to that app.

### Reset and Import Behavior

- Local mode reset actions clear browser-local workspace areas from Settings.
- API mode reset actions call the authenticated FastAPI workspace reset endpoint. The backend deletes only the signed-in user's scoped rows and Dashboard/Analytics refresh from the updated API data.
- Brand-new signed-in users who choose **Start Fresh** get an empty cloud workspace with the existing polished empty states and CTAs.
- If browser-local records exist while running API mode, Settings offers **Import local workspace**. The import is manual, skips likely duplicates, and stores only normal OfferOS records in the authenticated API account.

### Coding Practice Profiles

OfferOS can link a public LeetCode username and stores only the username and public profile URL. It never requests or stores a LeetCode password, cookie, session token, or CSRF token. Automatic activity synchronization is intentionally unavailable because OfferOS does not scrape LeetCode or use undocumented private APIs.

Use **Log problem** or **Import CSV** in Prep to record activity. CSV headers are `title`, `url`, `difficulty`, `topics`, `status`, `date`, `time_spent_minutes`, and `notes`; duplicates are skipped by problem title and date. API mode persists activities to the authenticated account, while local mode stores them in browser localStorage.

## Backend Scaffold

The backend foundation lives in `backend/`. It includes versioned REST routes, ownership-scoped SQLAlchemy repositories, Alembic migrations, Clerk JWT verification, a development demo-user fallback, Docker Compose, and pytest coverage.

See [`backend/README.md`](backend/README.md) for setup, migrations, API startup, authentication modes, and tests.

## Production Build

```bash
npm run build
npm run start
```

## Production API Sync

The backend is deployable as a Docker service on Render, Railway, or Fly.io. A Render Blueprint is included at `render.yaml`; it builds the FastAPI image, runs Alembic before deployment, and configures `/api/v1/health` as the public health check.

After deploying the API and configuring Clerk's `offeros-api` JWT template, set these Vercel build variables and redeploy:

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url/api/v1
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=offeros-api
```

See [`docs/deployment.md`](docs/deployment.md) for exact backend environment values, Clerk setup, smoke tests, and the production acceptance checklist.
Use [`docs/manual-qa.md`](docs/manual-qa.md) for authenticated release QA,
[`docs/production-smoke-test.md`](docs/production-smoke-test.md) after deployment, and
[`docs/environment.md`](docs/environment.md) for environment-variable classification.

## Test PWA Installation Locally

The service worker registers in production mode only so it does not interfere with Next.js development refreshes.

1. Run `npm run build`, then `npm run start`.
2. Open `http://localhost:3000` in Chrome or Edge. Localhost is treated as a secure context for PWA testing.
3. Open DevTools, then **Application**. Confirm the manifest, 192px and 512px icons, and `/sw.js` service worker are detected.
4. Use the browser install icon or the **Install OfferOS** action in Settings.
5. In DevTools Network conditions, switch offline and reload a previously visited route to verify the cached app shell.

On iPhone or iPad, open OfferOS in Safari and choose **Share > Add to Home Screen**.

## Current Limitations

- Local mode data is stored only in the current browser profile and is not partitioned by Clerk user.
- API mode does not automatically migrate existing localStorage records; use the manual Settings import when needed.
- Resume `applicationsUsed` is not persisted by the current backend schema and displays as zero in API mode.
- PDF/DOCX/TXT resume extraction is text-only. Image-only/scanned PDFs return a clear OCR-not-available-yet error.
- Resume fit scores are heuristic guidance for technical recruiting; they are not ATS guarantees.
- Prep goals remain local in API mode; completion sessions are derived from completed API tasks.
- Offline support covers the app shell and previously cached assets; it is not a cloud synchronization system.
- The Chrome extension targets API mode only. It does not crawl, access browser history, or synchronize into web-app localStorage.

## Planned Roadmap

- Portable export
- Optional account and cloud synchronization
- Optional OCR and private resume file storage
- Calendar and reminder integrations

## Recruiting Timelines

Applications support persistent interview, OA, offer, and follow-up events. These events drive application next actions, the Dashboard 14-day view, and the Smart Application Inbox. API mode can explicitly create or update selected events in Google Calendar; local mode retains timelines without external calendar sync.

## Smart Application Inbox

OfferOS derives a ranked recruiting inbox from application status, meaningful timeline events,
deadlines, resume context, analysis state, and interview preparation readiness. The `/inbox`
workspace and Dashboard **Needs attention** section use the same deterministic priority engine as
the notification and application workflows. Follow-up, deadline, missing-context, analysis, and prep actions link
directly to the relevant application workflow.

Dismissed and snoozed signals persist per user in API mode and in localStorage in local mode. A
dismissed signal becomes eligible again only when its underlying application state meaningfully
changes. Recruiter follow-up drafts reuse the existing Recruiter Copilot and are never sent
automatically.

## AI Mock Interviews

Prep includes resumable behavioral, resume deep-dive, technical concept, system design, and mixed
mock interviews. Sessions ask one question at a time, evaluate each answer, can ask up to two
grounded follow-ups per main question, and persist a final practice scorecard.

API mode reuses the backend OpenRouter provider configuration. Local mode uses clearly labeled
deterministic questions and simplified scoring in localStorage. Assessments are practice guidance,
not hiring predictions, and OfferOS does not claim private company interview knowledge. Voice and
code execution are not included.

## Launch readiness

New accounts use a resumable guided setup: welcome, resume, first application, optional fit
analysis, optional prep plan, and the personalized Today view. Existing accounts with meaningful
workspace data are inferred as complete and are not interrupted. API mode persists onboarding in
`user_settings`; local mode persists the same lifecycle in browser storage.

Today is backed by one `/api/v1/dashboard/today` request. It reuses Smart Inbox ranking for one
primary action and the next five attention items, then adds upcoming recruiting events, weekly
goals, a compact pipeline, meaningful activity, and resume performance. Notifications are
user-scoped, deduplicated, and available from the navigation bell and `/notifications`.

Settings now includes weekly goals, onboarding restart, monthly AI usage, JSON export, and
typed-confirmation account deletion. Public `/privacy` and `/terms` pages describe data processing
and AI limitations. AI feedback is heuristic guidance, not a hiring or ATS prediction.

Production reliability includes request IDs, structured request-duration logs, safe GET retries,
operation-specific timeouts, backend rate limits, monthly AI usage limits, `/health` and `/ready`,
recoverable Next.js error states, and optional privacy-scrubbed Sentry reporting.

## Gmail-assisted application tracking

API mode supports optional backend-managed Google OAuth with PKCE and the single
`https://www.googleapis.com/auth/gmail.readonly` Gmail scope. OfferOS scans a configurable,
bounded 90-day window initially, then uses Gmail history IDs for incremental sync. Deterministic
filtering runs before selective AI classification. Only limited metadata and capped plain-text
excerpts are stored; attachments and raw HTML are not retained.

Suggestions are review-only. Accepting one creates a confirmed application timeline event, and an
application status changes only when the user explicitly selects that option. Disconnect revokes
Google access when possible and always removes the encrypted refresh token. Local mode provides a
clearly labeled simulation and never starts real Google OAuth.
