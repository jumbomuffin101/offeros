# AI Usage and Reliability

Career Intelligence recommendations, observations, health, and trends are deterministic and do
not call an AI provider. Recruiter Copilot receives a sanitized CareerContext summary; job
descriptions, notes, and email-derived metadata remain explicitly untrusted data and cannot
override system instructions. No chain-of-thought is requested or stored.

OfferOS enforces monthly completed-operation limits in the backend. Defaults:

- Resume analyses: 10
- Application analyses: 20
- Prep plans: 10
- Mock interview sessions: 5
- Mock interview answer turns: 50
- Recruiter Copilot messages: 50
- Gmail candidate classifications: default operation limit

Limits are environment configuration, not frontend constants. A request creates a `started` usage
event, then becomes `completed` or `failed`. Only completed events count. Existing idempotency keys
prevent repeated resume/application analyses and mock-interview answers from consuming duplicate
usage.

Technical per-minute limits are separate from monthly product limits. They use a one-minute
in-memory window keyed by a hash of the bearer credential or client IP. This protects a single
process; multi-instance deployments should replace it with a shared Redis-backed limiter.

Provider failures are mapped to stable application errors by each AI service. Non-idempotent AI
POSTs are not automatically retried by the frontend. Users retain their input and can retry
manually. Scores and recommendations are heuristic guidance and do not predict hiring outcomes.

Mock Interview question planning is deterministic. The AI provider receives the session settings,
the sanitized Mock Interview Career Context projection, the persisted Question Plan, bounded recent
history, and current turn state. It does not receive the entire Career Context. Structured question,
evaluation, and scorecard responses are validated; malformed JSON is repaired once and otherwise
rejected. Per-turn observation candidates are not persisted as Career Observations until session
completion and a minimum repeated-evidence threshold is met.

Gmail classification reuses the configured provider only after deterministic filtering. Failed or
malformed provider requests remain failed usage and do not count as completed operations. The model
receives a capped excerpt and an instruction to treat email as untrusted data, return concise
structured evidence, and avoid forced application matches.
Resume analysis receives a sanitized CareerContext projection plus deterministic signals. Resume
text and job descriptions are explicitly marked as untrusted data. The model must not follow
embedded instructions, reveal prompts, or fabricate metrics. Comparability, application outcome
rates, observation scope, recommendation keys, and Career Health effects are computed server-side.

Behavioral Coach reuses the same configured OpenRouter provider and timeout policy. Deterministic STAR checks run first. Story text, practice answers, and sanitized context are untrusted data; the model returns strict concise JSON, receives one malformed-output repair attempt, and may not fabricate metrics or experiences. No chain-of-thought is requested or persisted. When AI is unavailable, server-side rules and clearly labeled local simulation preserve the workflow.
