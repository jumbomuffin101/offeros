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
