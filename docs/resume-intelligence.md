# Resume Career Intelligence

Career Intelligence Phase 3B enriches the existing Resume Manager and analysis APIs without
changing the AI provider or exposing the shared CareerContext. The resume analysis request still
sends resume text and the selected job description to the backend provider. OfferOS additionally
supplies a bounded, sanitized projection containing relevant prior analyses, active resume
observations, resume-linked mock interview signals, aggregate application outcomes, and active
resume recommendations. Resume text and job descriptions remain untrusted input.

## Analysis modes and comparability

- `general` evaluates overall SWE resume readiness.
- `target_role` evaluates a target role or role family.
- `application` remains scoped to the exact saved application and selected resume.
- Re-analysis compares only completed, non-deleted analyses for the same resume version.

An analysis is `comparable` for the same mode and exact role, or for the same application in
application mode. It is `partially_comparable` for the same mode and normalized role family. A
different mode, materially different role family, deleted/failed analysis, or incompatible schema
is `not_comparable`. OfferOS does not present score changes as improvement when comparison is not
valid. Legacy analyses remain visible but are not used for longitudinal claims when their schema
cannot be established.

## Deterministic evidence

Before AI runs, OfferOS detects objective signals such as missing quantified bullets, recurring
keyword gaps, stale resume versions, high-priority applications without an analysis, and weak
conversion only after enough outcomes exist. Application performance is grouped by resume and
similar role family. Rates require at least five submitted applications, always include raw counts,
exclude applications without a known resume version, and are described as correlation rather than
causation.

Completed analyses persist a versioned `intelligence_json` envelope with comparison metadata,
deterministic signals, scoped observation candidates, deduplicated recommendation summaries,
application performance, and bounded Career Health impact. The AI provider does not control these
objective calculations.

## Observations, recommendations, and health

Resume observations use `resume_version`, `role_family`, `application`, or `career_wide` scope.
Candidates below the confidence threshold are ignored. Repeated evidence updates one deterministic
observation, contradictory active evidence is superseded in the same scope, and narrow keyword
gaps are not promoted to career-wide facts.

Recommendations use stable keys and scoped deep links, so Today and Smart Inbox receive one card
per action through CareerContextBuilder. Resume readiness has a 15% Career Health weight. The
latest analysis contributes at most four points to the resume-readiness subscore; company-specific
gaps cannot create a large global swing, and failed analyses contribute nothing.

## Local mode and privacy

Local mode performs deterministic comparison and stores simulated intelligence in localStorage.
It is labeled as simulated and does not claim cloud AI output. Neither mode logs resume text, job
descriptions, provider prompts, tokens, or raw CareerContext. Export may include safe comparison and
aggregate summaries, but never hidden prompts, chain-of-thought, or cache contents.

