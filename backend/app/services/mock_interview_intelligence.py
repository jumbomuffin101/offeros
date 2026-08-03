from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Iterable

from app.schemas.mock_interview import (
    FocusArea,
    MockInterviewCreate,
    MockInterviewScorecardDraft,
    QuestionPlan,
    TurnEvaluation,
)


DIMENSION_LABELS = {
    "accuracy": "Technical accuracy",
    "relevance": "Answer relevance",
    "clarity": "Clear communication",
    "depth": "Technical depth",
    "structure": "Answer structure",
    "behavioral": "Behavioral storytelling",
    "resume_fluency": "Resume fluency",
    "system_design": "System design tradeoffs",
    "technical_reasoning": "Technical reasoning",
}


def build_question_plan(
    context: dict[str, Any], payload: MockInterviewCreate
) -> QuestionPlan:
    low_dimensions = _strings(context.get("recurring_low_scoring_dimensions"))
    strengths = _strings(context.get("validated_strengths"))
    observations = _records(context.get("active_observations"))
    prep_priorities = _strings(context.get("prep_priorities"))
    application_topics = _strings(context.get("application_specific_topics"))
    recent_prompts = _strings(context.get("recent_question_prompts"))

    focus_by_key: dict[str, FocusArea] = {}
    for dimension in low_dimensions[:4]:
        _focus(
            focus_by_key,
            dimension,
            DIMENSION_LABELS.get(dimension, dimension.replace("_", " ").title()),
            "This dimension has remained below your recent practice baseline.",
            "history",
        )
    for observation in observations[:4]:
        dimension = _text(observation.get("dimension")) or _text(
            observation.get("type")
        )
        if dimension:
            _focus(
                focus_by_key,
                dimension,
                DIMENSION_LABELS.get(
                    dimension, dimension.replace("_", " ").title()
                ),
                _text(observation.get("summary"))
                or "An active Career Intelligence observation supports this focus.",
                "observation",
            )
    for index, priority in enumerate(prep_priorities[:3]):
        _focus(
            focus_by_key,
            f"prep-{index}",
            priority[:120],
            "This area is part of the active role preparation plan.",
            "prep",
        )
    for index, topic in enumerate(application_topics[:3]):
        _focus(
            focus_by_key,
            f"role-{index}",
            topic[:120],
            "This topic is relevant to the selected application or resume.",
            "role",
        )

    if payload.focus_areas:
        selected = []
        known = {item.key: item for item in focus_by_key.values()}
        for key in payload.focus_areas:
            if key in known:
                selected.append(known[key])
            else:
                selected.append(
                    FocusArea(
                        key=key[:80],
                        label=key.replace("_", " ").title()[:120],
                        reason="Selected explicitly for this practice session.",
                        source="default",
                    )
                )
        focus_areas = selected[:8]
    else:
        focus_areas = list(focus_by_key.values())[:6]

    if not focus_areas:
        default_key = _default_dimension(payload.interview_type)
        focus_areas = [
            FocusArea(
                key=default_key,
                label=DIMENSION_LABELS[default_key],
                reason="A balanced baseline focus for the selected interview type.",
                source="default",
            )
        ]

    return QuestionPlan(
        interview_type=payload.interview_type,
        difficulty=payload.difficulty,
        target_dimensions=[item.key for item in focus_areas[:5]],
        priority_topics=[item.label for item in focus_areas[:5]],
        avoid_recent_repetition=recent_prompts[:8],
        recurring_weaknesses=low_dimensions[:5],
        validated_strengths=strengths[:5],
        application_specific_topics=application_topics[:5],
        focus_areas=focus_areas,
        question_count=payload.question_count,
        max_follow_ups_per_question=2,
    )


def aggregate_completion(
    evaluations: list[TurnEvaluation],
    scorecard: MockInterviewScorecardDraft,
    context: dict[str, Any],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    previous = _records(context.get("recent_interviews"))
    prior_scores = [
        int(row["overall_score"])
        for row in previous[:5]
        if isinstance(row.get("overall_score"), (int, float))
    ]
    current = round(
        sum(
            [
                scorecard.communication_score,
                scorecard.technical_accuracy_score,
                scorecard.structure_score,
                scorecard.depth_score,
                scorecard.relevance_score,
            ]
        )
        / 5
    )
    baseline = round(sum(prior_scores) / len(prior_scores)) if prior_scores else None
    delta = current - baseline if baseline is not None else None
    direction = (
        "improving"
        if delta is not None and delta >= 5
        else "declining"
        if delta is not None and delta <= -5
        else "stable"
        if delta is not None
        else "insufficient_data"
    )
    trend = {
        "direction": direction,
        "current_score": current,
        "recent_average": baseline,
        "delta": delta,
        "sample_size": len(prior_scores),
        "strongest_dimension": _extreme_dimension(scorecard, max),
        "weakest_dimension": _extreme_dimension(scorecard, min),
    }

    candidates: dict[tuple[str, str], list[float]] = defaultdict(list)
    summaries: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    for evaluation in evaluations:
        for item in evaluation.observation_candidates:
            key = (item.type, item.dimension.strip().lower())
            candidates[key].append(item.confidence)
            summaries[key][item.summary.strip()] += 1

    dimension_values = _dimension_values(evaluations)
    updates: list[dict[str, object]] = []
    for dimension, values in dimension_values.items():
        if len(values) < 2:
            continue
        average = sum(values) / len(values)
        if average <= 2.75:
            candidates[("interview_weakness", dimension)].extend(
                [min(0.92, 0.6 + len(values) * 0.06)] * len(values)
            )
        elif average >= 4.2:
            candidates[("interview_strength", dimension)].extend(
                [min(0.9, 0.58 + len(values) * 0.06)] * len(values)
            )

    preferred_signal: dict[str, str] = {}
    for type_, dimension in candidates:
        if type_ not in {"interview_weakness", "interview_strength"}:
            continue
        current_signal = preferred_signal.get(dimension)
        values = dimension_values.get(dimension, [])
        average = sum(values) / len(values) if values else 3
        preferred = "interview_strength" if average >= 3.5 else "interview_weakness"
        if current_signal is None or type_ == preferred:
            preferred_signal[dimension] = type_

    for (type_, dimension), confidences in sorted(candidates.items()):
        if len(confidences) < 2:
            continue
        if (
            type_ in {"interview_weakness", "interview_strength"}
            and preferred_signal.get(dimension) != type_
        ):
            continue
        summary = (
            summaries[(type_, dimension)].most_common(1)[0][0]
            if summaries[(type_, dimension)]
            else _default_summary(type_, dimension)
        )
        updates.append(
            {
                "type": type_,
                "dimension": dimension,
                "summary": summary[:300],
                "confidence": round(min(0.95, sum(confidences) / len(confidences)), 2),
                "evidence_count": len(confidences),
            }
        )

    if direction == "improving" and trend["weakest_dimension"]:
        dimension = str(trend["weakest_dimension"])
        updates.append(
            {
                "type": "interview_improvement",
                "dimension": dimension,
                "summary": f"Recent mock interview performance improved by {delta} points.",
                "confidence": min(0.9, 0.65 + len(prior_scores) * 0.05),
                "evidence_count": len(prior_scores) + 1,
            }
        )
    return trend, updates[:8]


def _dimension_values(
    evaluations: Iterable[TurnEvaluation],
) -> dict[str, list[int]]:
    values: dict[str, list[int]] = defaultdict(list)
    for item in evaluations:
        for dimension in ("accuracy", "relevance", "clarity", "depth", "structure"):
            values[dimension].append(getattr(item.scores, dimension))
    return values


def _extreme_dimension(
    scorecard: MockInterviewScorecardDraft, selector: Any
) -> str:
    values = {
        "clarity": scorecard.communication_score,
        "accuracy": scorecard.technical_accuracy_score,
        "structure": scorecard.structure_score,
        "depth": scorecard.depth_score,
        "relevance": scorecard.relevance_score,
    }
    target = selector(values.values())
    return next(key for key, value in values.items() if value == target)


def _default_summary(type_: str, dimension: str) -> str:
    label = DIMENSION_LABELS.get(dimension, dimension.replace("_", " "))
    if type_ == "interview_strength":
        return f"{label.capitalize()} was consistently strong in this session."
    return f"{label.capitalize()} needs additional deliberate practice."


def _default_dimension(interview_type: str) -> str:
    return {
        "behavioral": "structure",
        "resume": "resume_fluency",
        "technical": "technical_reasoning",
        "system_design": "system_design",
    }.get(interview_type, "clarity")


def _focus(
    items: dict[str, FocusArea], key: str, label: str, reason: str, source: str
) -> None:
    items.setdefault(
        key,
        FocusArea(
            key=key[:80],
            label=label[:120],
            reason=reason[:300],
            source=source,
        ),
    )


def _records(value: object) -> list[dict[str, Any]]:
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def _strings(value: object) -> list[str]:
    return [item for item in value if isinstance(item, str) and item.strip()] if isinstance(value, list) else []


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""
