from app.career_intelligence.repository import CareerSnapshot
from app.career_intelligence.schemas import CareerHealth


WEIGHTS = {
    "application_momentum": 20,
    "resume_readiness": 15,
    "interview_readiness": 15,
    "coding_consistency": 15,
    "behavioral_readiness": 10,
    "system_design_readiness": 10,
    "follow_up_health": 8,
    "deadline_health": 7,
}


def calculate_health(snapshot: CareerSnapshot, metrics: dict[str, object]) -> CareerHealth:
    evidence_count = len(snapshot.applications) + len(snapshot.resumes) + len(snapshot.coding_activity)
    evidence_count += len(snapshot.behavioral) + len(snapshot.system_design) + len(snapshot.mock_interviews)
    if evidence_count < 2:
        return CareerHealth(
            status="insufficient_data",
            subscores={key: None for key in WEIGHTS},
            reason_codes=["INSUFFICIENT_HISTORY"],
            data_sufficiency=min(0.3, evidence_count / 6),
            recommended_actions=["Add an application or complete a prep activity to establish a baseline."],
        )

    active = int(metrics["active_applications"])
    recent_apps = int(metrics["recent_applications"])
    stale = int(metrics["stale_follow_ups"])
    deadlines = int(metrics["urgent_deadlines"])
    latest_analysis_by_resume = {}
    for analysis in snapshot.analyses:
        latest_analysis_by_resume.setdefault(analysis.resume_version_id, analysis)
    resume_readiness = _resume_readiness(
        len(snapshot.resumes), list(latest_analysis_by_resume.values())
    )
    completed_coding = int(metrics["coding_completed_14d"])
    completed_behavioral = int(metrics["behavioral_completed"])
    completed_design = int(metrics["system_design_completed"])
    completed_interviews = [r for r in snapshot.mock_interviews if r.status == "completed" and r.overall_score is not None]
    interview_score = _bounded_interview_score(
        [row.overall_score for row in completed_interviews]
    )

    subscores: dict[str, int | None] = {
        "application_momentum": min(100, 45 + recent_apps * 12) if snapshot.applications else None,
        "resume_readiness": resume_readiness,
        "interview_readiness": interview_score if interview_score is not None else (55 if active else None),
        "coding_consistency": _blend_type_readiness(
            min(100, 35 + completed_coding * 12)
            if snapshot.coding_activity or snapshot.coding_problems
            else None,
            [
                row.scorecard.technical_reasoning_score
                for row in completed_interviews
                if row.scorecard
                and row.scorecard.technical_reasoning_score is not None
            ],
        ),
        "behavioral_readiness": _blend_type_readiness(
            _behavioral_story_readiness(snapshot.behavioral, completed_behavioral),
            [row.scorecard.behavioral_score for row in completed_interviews if row.scorecard and row.scorecard.behavioral_score is not None],
        ),
        "system_design_readiness": _blend_type_readiness(
            min(100, 35 + completed_design * 15) if snapshot.system_design else None,
            [row.scorecard.system_design_score for row in completed_interviews if row.scorecard and row.scorecard.system_design_score is not None],
        ),
        "follow_up_health": max(20, 100 - stale * 20) if snapshot.applications else None,
        "deadline_health": max(15, 100 - deadlines * 25) if snapshot.applications else None,
    }
    available_weight = sum(WEIGHTS[key] for key, value in subscores.items() if value is not None)
    overall = round(sum((value or 0) * WEIGHTS[key] for key, value in subscores.items() if value is not None) / available_weight)
    positives = [label for key, label in (
        ("application_momentum", "Application activity is moving."),
        ("resume_readiness", "Analyzed resumes provide a stronger role-fit baseline."),
        ("coding_consistency", "Recent coding practice is consistent."),
    ) if (subscores[key] or 0) >= 70]
    negatives = []
    if stale:
        negatives.append(f"{stale} application follow-up signal{'s' if stale != 1 else ''} need attention.")
    if deadlines:
        negatives.append(f"{deadlines} near-term deadline{'s' if deadlines != 1 else ''} need attention.")
    return CareerHealth(
        status="ready",
        overall_score=overall,
        subscores=subscores,
        reason_codes=[key.upper() for key, value in subscores.items() if value is not None and value < 55],
        positive_drivers=positives[:3],
        negative_drivers=negatives[:3],
        data_sufficiency=min(1, evidence_count / 20),
        recommended_actions=negatives[:2] or ["Maintain the current weekly recruiting cadence."],
    )


def _bounded_interview_score(scores: list[int]) -> int | None:
    if not scores:
        return None
    recent = scores[:5]
    weights = [1, 0.8, 0.65, 0.5, 0.4][: len(recent)]
    average = sum(score * weight for score, weight in zip(recent, weights)) / sum(weights)
    contribution = min(0.6, 0.15 * len(recent))
    return max(0, min(100, round(55 + (average - 55) * contribution)))


def _blend_type_readiness(base: int | None, scores: list[int]) -> int | None:
    if not scores:
        return base
    interview = _bounded_interview_score(scores)
    if base is None:
        return interview
    return round(base * 0.7 + (interview or base) * 0.3)


def _resume_readiness(total_resumes: int, analyses: list[object]) -> int | None:
    if total_resumes == 0:
        return None
    if not analyses:
        return 45
    average = sum(int(getattr(row, "overall_score", 0)) for row in analyses) / len(analyses)
    coverage = min(1, len(analyses) / total_resumes)
    bounded_score_signal = max(-10, min(10, round((average - 70) * 0.35)))
    latest = analyses[0]
    intelligence = getattr(latest, "intelligence_json", {})
    health = intelligence.get("career_health_impact", {}) if isinstance(intelligence, dict) else {}
    longitudinal_delta = max(-4, min(4, int(health.get("resume_readiness_delta") or 0)))
    return max(35, min(90, round(55 + coverage * 10 + bounded_score_signal + longitudinal_delta)))


def _behavioral_story_readiness(stories: list[object], completed: int) -> int | None:
    if not stories:
        return None
    values = {"draft": 42, "needs_work": 52, "practice_ready": 68, "interview_ready": 82}
    average = sum(values.get(str(getattr(row, "readiness_status", "draft")), 42) for row in stories) / len(stories)
    evaluated = sum(bool(getattr(row, "latest_evaluated_at", None)) for row in stories)
    coverage = min(6, evaluated) * 2
    consistency = min(4, completed) * 1.5
    # Story intelligence can move this subscore by at most 10 points from its baseline.
    return max(35, min(90, round(average + coverage + consistency)))
