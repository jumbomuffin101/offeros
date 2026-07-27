# OfferOS Privacy Operations

The public product policy lives at `/privacy`. This document describes implementation behavior.

- API records are scoped by the authenticated OfferOS user ID.
- Local mode keeps workspace records in browser localStorage.
- Resume files are processed in memory or temporary storage; extracted text is retained, file bytes are not.
- AI requests are backend-only and include only context needed for the requested operation.
- Structured logs omit bodies, tokens, prompts, resume text, job descriptions, and interview answers.
- Optional Sentry reporting sets `send_default_pii=false` and removes request data and sensitive headers.
- JSON export excludes credentials, secrets, internal prompts, logs, and temporary upload bytes.
- Account deletion removes OfferOS database records first, then the frontend requests deletion of the active Clerk user.

Operational limitation: if Clerk account deletion fails after database deletion, the authentication
identity may remain without OfferOS workspace data. The user receives an error and administrators
can resolve the remaining Clerk identity from the Clerk dashboard.

## Gmail data handling

- Gmail is optional and uses only `gmail.readonly`; no mailbox mutations are implemented.
- Initial discovery is bounded and incremental sync uses Gmail history IDs.
- Clearly unrelated messages are rejected before AI. Candidate AI prompts contain only sender,
  subject, capped excerpt, date, deterministic signals, and minimal application summaries.
- Email content is untrusted data. Prompts explicitly forbid following instructions in email.
- Refresh tokens use Fernet authenticated encryption and are never serialized, logged, exported,
  or sent to Sentry.
- Deletion removes unconfirmed suggestions, metadata, excerpts, cursors, and safe diagnostics while
  retaining user-confirmed application timeline events.
