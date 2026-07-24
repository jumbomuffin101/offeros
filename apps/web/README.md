# OfferOS Web

Next.js App Router frontend for OfferOS.

## Launch flow

Authenticated new users receive resumable onboarding. Existing users with applications, resumes, or
prep data are inferred as onboarded. The root route is the Today dashboard and reads one
`/dashboard/today` aggregate in API mode.

The navigation bell loads user-scoped notifications. Settings provides weekly goals, onboarding
restart, AI usage visibility, JSON export, scoped resets, and typed-confirmation account deletion.
Privacy and terms pages are public.

## Data modes

- `NEXT_PUBLIC_DATA_MODE=local`: browser storage, deterministic local interview behavior, local
  onboarding/notifications, and JSON export.
- `NEXT_PUBLIC_DATA_MODE=api`: Clerk-authenticated FastAPI persistence and configured backend AI.

Set `NEXT_PUBLIC_API_BASE_URL` to the `/api/v1` backend URL in API mode. The API client performs one
backend wake-up, shares/caches safe GETs, uses operation-specific timeouts, attaches request IDs,
and does not automatically retry non-idempotent POST operations.

## Validation

```bash
npm run lint
npm run build
node --test tests/*.test.mjs
```
