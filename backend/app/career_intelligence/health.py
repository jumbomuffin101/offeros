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
    analyzed = sum(bool(r.latest_analysis_id or r.analysis_status == "completed") for r in snapshot.resumes)
    completed_coding = int(metrics["coding_completed_14d"])
    completed_behavioral = int(metrics["behavioral_completed"])
    completed_design = int(metrics["system_design_completed"])
    completed_interviews = [r for r in snapshot.mock_interviews if r.status == "completed" and r.overall_score is not None]

    subscores: dict[str, int | None] = {
        "application_momentum": min(100, 45 + recent_apps * 12) if snapshot.applications else None,
        "resume_readiness": min(100, 45 + analyzed * 25) if snapshot.resumes else None,
        "interview_readiness": min(100, round(sum(r.overall_score or 0 for r in completed_interviews) / len(completed_interviews))) if completed_interviews else (55 if active else None),
        "coding_consistency": min(100, 35 + completed_coding * 12) if snapshot.coding_activity or snapshot.coding_problems else None,
        "behavioral_readiness": min(100, 35 + completed_behavioral * 15) if snapshot.behavioral else None,
        "system_design_readiness": min(100, 35 + completed_design * 15) if snapshot.system_design else None,
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
