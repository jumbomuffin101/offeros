# OfferOS Production Roadmap

## Roadmap Principles

- Complete the system-of-record foundation before AI or broad integrations.
- Preserve current user workflows while replacing persistence behind repositories.
- Ship vertical slices with observability, security, migration, and recovery included.
- Treat every “coming soon” surface as planned until its exit criteria are met.
- Use measured product demand to prioritize integrations and infrastructure.

## Phase 1: Local-First MVP - Complete

### Delivered

- Professional Next.js App Router PWA and responsive dark SaaS shell.
- Applications localStorage CRUD, pipeline statuses, deadlines, filtering, and notes.
- Resume version manager with filename-only local references and CRUD.
- Coding, behavioral STAR, and system design prep workspaces.
- Weekly goals, streaks, prep progress, and completion history.
- Dynamic dashboard, analytics, recruiting plan, deadlines, and activity.
- Settings, Help Center, onboarding, command palette, offline shell, and install support.
- Viewport-safe shared modal shell and consistent Prep modal/drawer behavior.

### Known Boundaries

- Data exists only in one browser profile.
- No identity, cloud backup, cross-device sync, collaboration, real file storage, extraction, or AI.
- PWA offline support covers the shell and local records, not cloud conflict resolution.

### Exit Criteria

- Current frontend behavior remains stable.
- Local domain types and repositories are documented for cloud migration.
- Production architecture, database, API, auth, and deployment decisions are approved.

## Phase 2: Backend Foundation and Cloud Sync

### Objective

Make OfferOS a secure multi-device product without changing the core user model.

### Scope

1. Create FastAPI modular monolith and PostgreSQL migrations.
2. Implement Clerk Google, GitHub, and email authentication.
3. Provision users, profiles, settings, and ownership-scoped authorization.
4. Implement `/api/v1` applications, resumes metadata, prep, goals, and analytics APIs.
5. Add typed OpenAPI client/repositories to Next.js.
6. Build one-time localStorage import with client-generated idempotency keys.
7. Add cloud synchronization and conflict/version handling.
8. Add private resume object storage and signed upload/download intents.
9. Add account export, deletion, audit, backups, Sentry, and production runbooks.

### Delivery Slices

- **2A - Identity:** Clerk, user bootstrap, profiles, protected routes, ownership tests.
- **2B - Applications:** cloud CRUD, local migration, dashboard/analytics parity.
- **2C - Prep:** cloud CRUD, sessions/goals, offline mutation replay.
- **2D - Resumes:** logical resumes, immutable versions, private file upload.
- **2E - Production readiness:** monitoring, limits, recovery, privacy workflows.

### Exit Criteria

- A user can sign in on two devices and see consistent applications, resumes, and prep data.
- Existing local data imports once without duplication or loss.
- Cross-user resource access tests always fail safely.
- Backup restoration, account export, and account deletion are tested.
- Production service objectives and alerting are active.

## Phase 3: Job Capture and Chrome Extension

### Objective

Reduce manual application entry while retaining user review and data quality.

### Scope

- Chrome extension authentication and installation identity.
- Saved Jobs inbox and idempotent extension import ledger.
- User-reviewed conversion from saved job to application.
- Source parsers and version reporting for:
  - LinkedIn
  - Greenhouse
  - Lever
  - Ashby
  - Workday
- Duplicate detection using source job ID, canonical URL, company, and title.
- Parser telemetry without retaining unnecessary page HTML.
- Extension release, permission, privacy, and rollback process.

### Sequencing

1. Ship Greenhouse/Lever/Ashby first because their job structures are more consistent.
2. Add LinkedIn only after permission and policy review.
3. Add Workday with a versioned parser strategy because tenant implementations vary.

### Exit Criteria

- Imports are idempotent and never silently create applications.
- Parser failures are visible and recoverable.
- Extension permissions are minimal and privacy disclosures are approved.
- Import-to-saved-job success and duplicate rates are observable.

## Phase 4: Resume Intelligence and Interview AI

### Objective

Add evidence-linked, asynchronous assistance without coupling AI providers to core CRUD.

### Foundation

- Resume text extraction pipeline with malware scanning, parser versioning, and reviewable extracted sections.
- AI request ledger, provider gateway, Pydantic output validation, rate limits, cost caps, and consent.
- Prompt/version evaluation suite using synthetic and consented test fixtures.
- Clear product labeling that AI output is advisory.

### Features

1. **AI role-fit resume analysis**
   - Missing keywords and skills
   - Weak or vague bullets
   - Fit and evidence scores
   - Source resume/job version references
2. **Job matching**
   - Rank saved jobs against profile and resume evidence
   - Explain matching signals
3. **Resume optimization**
   - Suggested bullet rewrites with factuality checks
   - User accepts edits; AI never overwrites source versions
4. **Behavioral feedback**
   - STAR completeness, specificity, impact, and company context
5. **System design coach**
   - Requirements, capacity, architecture, tradeoffs, and communication rubric
6. **Company-specific prep**
   - Curated company/process context with source freshness
7. **Mock interviews**
   - Structured sessions, rubrics, feedback, and history

### Exit Criteria

- Extraction quality and failure modes are measurable and reviewable.
- AI outputs always pass structured validation before display.
- Cost, latency, model, prompt version, and source references are auditable.
- Sensitive user data is minimized and governed by explicit consent/retention.
- Quality evaluations meet release thresholds for each feature independently.

## Phase 5: Recruiting Operations

### Objective

Turn OfferOS into a complete technical recruiting operating system around the validated core.

### Notifications

- In-app deadline, follow-up, OA, interview, and offer reminders.
- Email/push channels, quiet hours, deduplication, and delivery history.
- User-controlled preferences and clear unsubscribe behavior.

### Calendar Integration

- Google Calendar and Microsoft calendar OAuth.
- Interview event linking and conflict-aware reminders.
- Read/write scope separation and revocation controls.

### Email Parsing

- User-consented recruiting mailbox connection or forwarding address.
- Classify recruiter updates, OA invites, interview scheduling, and rejections.
- Draft updates for confirmation; no silent pipeline mutation initially.

### Recruiter CRM and Networking

- Recruiter/contact entities, conversation notes, follow-up tasks, and relationship history.
- Networking tracker for coffee chats, events, alumni, and hiring teams.
- Referral tracker with request, submission, follow-up, and outcome states.

### Offer Support

- Structured offer comparison across compensation, location, team, growth, and deadlines.
- Salary negotiation preparation, market context, and communication drafts.
- High-stakes guidance includes clear limitations and user confirmation.

### Exit Criteria

- Integrations use least-privilege OAuth and pass security/privacy review.
- Automated suggestions require confirmation before mutating the recruiting pipeline.
- Notification delivery, calendar sync, and email parser accuracy are observable.
- Offer calculations are deterministic and source assumptions are visible.

## Cross-Phase Engineering Tracks

### Security and Privacy

- Threat modeling before each new data source/provider.
- Least privilege, audit events, retention schedules, export/deletion coverage.
- Dependency and container scanning in CI.
- Annual penetration test before materially expanding integrations.

### Reliability

- Service objectives for API, uploads, sync, and asynchronous jobs.
- Database restore exercises and incident runbooks.
- Idempotency and replay tests for every integration.

### Accessibility and Product Quality

- Keyboard and screen-reader acceptance criteria for every workflow.
- Mobile/PWA viewport testing.
- No roadmap surface implies a feature works before production readiness.

### Analytics and Experimentation

- Privacy-safe event taxonomy.
- Funnel definitions tied to product decisions.
- Feature flags for staged rollout and provider fallback.

## Explicitly Deferred

- Microservices before independent scale/ownership is demonstrated.
- Real-time collaboration and organization workspaces.
- Public third-party developer API.
- Autonomous application submission or recruiter communication.
- AI decisions that alter source resumes, applications, or high-stakes outcomes without user review.

## Prioritization Gate

Before beginning a phase, confirm:

1. The preceding phase's exit criteria are met.
2. The user problem and success metric are defined.
3. Data classification, retention, and provider risks are reviewed.
4. Operational ownership and rollback are documented.
5. The feature can ship as a vertical slice without creating a second source of truth.
