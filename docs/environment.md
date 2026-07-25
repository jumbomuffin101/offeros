# Environment Variable Classification

## Backend

| Variable | Classification | Notes |
| --- | --- | --- |
| `APP_ENV` | required production | `production`; validates critical settings |
| `DATABASE_URL` | required | Managed PostgreSQL URL |
| `API_V1_PREFIX` | optional | Defaults to `/api/v1` |
| `AUTH_REQUIRED` | required production | Must be `true` |
| `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE` | required production | Clerk API JWT verification |
| `CORS_ORIGINS` | required production | Exact frontend/extension origins; no wildcard |
| `TRUSTED_HOSTS` | required production | Exact backend hostnames |
| `FRONTEND_APP_URL` | required production | Canonical Vercel URL |
| `AI_PROVIDER`, `AI_MODEL` | optional | Required only for AI features |
| `OPENROUTER_API_KEY` | required when OpenRouter enabled | Backend secret |
| `AI_TIMEOUT_SECONDS`, `AI_CONNECT_TIMEOUT_SECONDS`, `AI_MAX_TOKENS` | optional | AI bounds |
| `AI_LIMIT_*` | optional | Product usage policy limits |
| `AI_MOCK_ENABLED` | development/test only | Keep `false` in production |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY` | optional group | All required when Calendar is enabled |
| `SENTRY_DSN` | optional | Absence never blocks startup |
| `LOG_LEVEL` | optional | Defaults to `INFO` |

OfferOS stores extracted resume text and metadata, not permanent uploaded file bytes. There is no
file-storage credential in this release.

## Frontend

| Variable | Classification | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | required | Clerk frontend/server auth |
| `NEXT_PUBLIC_CLERK_*_URL` | optional | Defaults documented in `.env.example` |
| `NEXT_PUBLIC_CLERK_JWT_TEMPLATE` | required API mode | `offeros-api` |
| `NEXT_PUBLIC_API_BASE_URL` | required API mode | Backend `/api/v1` URL |
| `NEXT_PUBLIC_DATA_MODE` | required | `local` or `api` |

Example files contain placeholders/local defaults only. Never place OpenRouter, database, token
encryption, Google client secret, or backend Sentry credentials in frontend variables.
