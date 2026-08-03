# Mock Interview Career Intelligence

Career Intelligence Phase 3A enriches the existing text-based Mock Interview workflow without
changing its provider abstraction or making user settings advisory. The selected interview type,
difficulty, question count, application, resume, and focus areas remain authoritative.

## Context Selection

`MockInterviewContextService` requests shared Career Intelligence and projects only:

- the selected application and resume summaries;
- confirmed resume strengths and weaknesses;
- active interview-related observations;
- up to eight recent completed sessions and bounded recent question prompts;
- recurring score dimensions, prep priorities, readiness signals, and a confirmed interview date.

Raw resume text, full job descriptions, application notes, Gmail content, unrelated applications,
user IDs, tokens, hidden prompts, and provider diagnostics are excluded. All selected text remains
untrusted data in the AI system prompt.

## Planning And Questions

`POST /api/v1/mock-interviews/plan` returns an adjustable deterministic `QuestionPlan`. Recurring
signals require longitudinal evidence; a single low prior score does not become a recurring
weakness. Recent prompts are supplied as an avoidance list. The selected plan and sanitized context
are stored with the session so normal answer turns do not rebuild the full Career Context.

The AI provider asks one question at a time, may ask at most two grounded follow-ups per main
question, and cannot claim knowledge of a company's private interview process. Provider output is
strictly validated and malformed JSON receives one bounded repair attempt.

## Completion And Observations

Turn evaluations can propose concise strength, weakness, or improvement candidates. Completion
aggregates these candidates and dimension scores. A normal strength or weakness requires at least
two pieces of evidence before it can reach the shared observation reconciler. Observation keys are
deterministic by type and dimension; contradictory active strength/weakness records supersede each
other, while dismissed observations remain dismissed.

Completion creates deterministic practice recommendations such as
`mock-interview-practice:depth`, with a valid Prep deep link and seven-day expiry. Career Context is
refreshed once after the session transaction commits, updating Today and Smart Inbox without a
workspace-wide frontend refetch.

## Health Weighting And Limits

Only completed sessions with a score affect readiness. Abandoned or provider-failed sessions are
ignored. Up to five recent scores use recency weights of `1.0`, `0.8`, `0.65`, `0.5`, and `0.4`.
Their contribution blends from a neutral 55 baseline and is capped by sample count, so one session
can move the interview-readiness subscore by only a small amount. Behavioral and system-design
practice scores are blended at 30% with their existing prep readiness when both sources exist;
technical-reasoning scores use the same bounded blend with coding consistency.

Scores are AI-generated practice guidance, not hiring predictions. Insufficient history remains an
explicit state.

## Local Mode

Local mode persists sessions in browser localStorage and uses deterministic question plans,
questions, simplified scoring, trend summaries, and observation summaries. The active session and
scorecard are labeled as simulated local practice; no backend or live AI is implied.

## Lifecycle

Migration `20260803_0019` adds the persisted context version, context projection, question plan,
trend, observation summary, and intelligence status. Legacy sessions receive empty safe defaults.
Account export includes safe plans/trends/observation summaries but excludes the context projection.
Account deletion and Prep reset remove sessions and cascading turns/scorecards.

Voice interviews and Career Intelligence Phase 3B consumers (Resume Intelligence migration, Gmail
classification, Behavioral Coach, and System Design Coach) remain deferred.
