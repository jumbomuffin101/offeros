# Authenticated Manual QA

Use valid Clerk development credentials and non-production provider accounts. Record browser,
viewport, API request ID, and result for each failure.

## New User

- Sign up, verify redirect to onboarding, refresh each step, and confirm progress resumes.
- Upload a PDF/DOCX resume; verify extraction, manual-text fallback, and no permanent file bytes.
- Create the first application, run one job-specific fit analysis, and generate its prep plan.
- Complete onboarding and confirm Today shows the expected top action, inbox, goals, and activity.

## Returning User

- Sign out/in; confirm onboarding does not reappear and notifications persist.
- Compare Today top action with Smart Inbox ordering and application state.
- Verify weekly goals/progress, recent activity, resume analysis history, and mock interview history.

## Failure States

- Exercise backend cold start, AI timeout, provider 429/5xx, malformed model output, and usage limit.
- Simulate notification and export failures; confirm retry/error UI without a white screen.
- Open account deletion, cancel it, and confirm no request or data change occurs.

## Responsive And Accessibility

- Test widths 320, 375, 768, 1024, and large desktop; inspect all drawers and modals.
- Complete primary flows by keyboard; verify focus visibility, modal focus trapping, and Escape.
- Verify form errors have labels/focus and loading/success/error states are announced.
- Check dark, light, and system themes at each representative width.

## Sentry

- Backend: with a development Sentry project, set `SENTRY_DSN`, start locally, and capture a test
  exception from a one-off Python shell. Confirm authorization/cookies and recruiting content are absent.
- Frontend Sentry is not currently integrated. Do not claim frontend capture verification until an
  SDK is added and a browser-thrown test exception is observed in a development Sentry project.
- Never add an exception endpoint or deliberate production crash.
