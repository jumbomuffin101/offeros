# Behavioral Coach

Career Intelligence Phase 3C turns existing behavioral-question records into reusable STAR stories without replacing their CRUD contract.

## Competency taxonomy

OfferOS uses a controlled, company-neutral taxonomy: ownership, leadership, conflict, failure, ambiguity, collaboration, communication, customer focus, initiative, adaptability, prioritization, influence, learning, resilience, impact, and ethics. A story may cover multiple competencies. These labels are coaching categories, not a private employer rubric.

## Deterministic checks

Before optional AI evaluation, OfferOS checks Situation, Task, Action, Result, reflection, personal ownership, real quantified evidence, context length, tradeoffs, conflict resolution, and failure learning. Signals include `missing_result`, `weak_action`, `unclear_ownership`, `no_quantification`, `too_much_context`, `insufficient_reflection`, `vague_outcome`, `weak_conflict_resolution`, `no_tradeoff`, and `no_failure_learning`. The product asks users to add a real metric when available and never fabricates one.

## Evaluation and comparison

Evaluations use schema `behavioral-evaluation-v1`. The same story, competency focus, and schema are comparable. The same story with a different focus is partially comparable. Different stories or incompatible schemas are not comparable. Only valid comparisons produce score deltas.

When OpenRouter is configured, the shared backend provider performs strict JSON evaluation with one malformed-output repair. Without live AI, deterministic evaluation remains available. Local-mode results are explicitly simulated.

## Readiness and portfolio

Readiness is `draft`, `needs_work`, `practice_ready`, or `interview_ready`. It combines deterministic completeness, validated evaluation quality, practice count, recency, and user confidence. Confidence alone cannot make a story interview-ready, and the label is not a hiring guarantee.

Portfolio aggregation reports competency coverage, missing competencies, overused stories, stories needing work, strongest and weakest evaluated stories, and one next action. Overview endpoints do not load raw practice answers.

## Career Intelligence

Behavioral evaluation receives a sanitized projection of CareerContext: relevant active observations, recent behavioral mock scores, behavioral prep-plan focus, bounded practice history, competency coverage, behavioral readiness, and summarized resume experience. It excludes raw Gmail, raw resumes, unrelated prep, hidden prompts, tokens, and private notes.

Story-scoped observations may be created after one validated evaluation. Broader competency or career-wide claims require repeated evidence. Recommendations use deterministic keys and deep-link to `/prep?tab=behavioral`; Today and Smart Inbox deduplicate by key.

Behavioral readiness contributes 10% of Career Health. The story-derived subscore is bounded to 35-90 and blends with bounded mock-interview evidence. A single evaluation cannot sharply move the overall score, failed evaluations have no impact, and new users remain in an explicit insufficient-data state.

## Privacy and lifecycle

Story and practice text is treated as untrusted data and is never logged. AI prompts request concise structured results without chain-of-thought. Exports include user-authored stories, practice answers, and safe evaluation summaries. Account deletion and workspace reset remove stories, evaluations, practices, and related observations. User-scoped cache invalidation occurs after committed mutations.
