from datetime import UTC, datetime, timedelta

from app.career_intelligence.repository import CareerSnapshot
from app.career_intelligence.schemas import CareerRecommendation


PRIORITY_ORDER = {"urgent": 4, "high": 3, "medium": 2, "low": 1}


def generate_recommendations(snapshot: CareerSnapshot, now: datetime) -> list[CareerRecommendation]:
    now = _utc(now)
    plans = {row.application_id for row in snapshot.prep_plans if row.status == "ready"}
    recommendations: dict[str, CareerRecommendation] = {}
    for application in snapshot.applications:
        status = application.status.value
        updated = _utc(application.meaningful_updated_at or application.updated_at)
        days_stale = (now - updated).days
        if application.deadline and 0 <= (application.deadline - now.date()).days <= 3 and status in {"oa", "interview", "final_round"}:
            kind = "complete_oa" if status == "oa" else "prepare_interview"
            _add(recommendations, _rec(
                f"{kind}:{application.id}:{application.deadline.isoformat()}", kind,
                "Complete the assessment before its deadline" if status == "oa" else "Prepare for the upcoming interview",
                f"{application.company} - {application.role} has a near-term deadline.",
                "urgent", "Open application", f"/applications?open={application.id}&action=prep",
                ["DEADLINE_WITHIN_72_HOURS"], [str(application.id)], now, application.id,
                datetime.combine(application.deadline + timedelta(days=1), datetime.min.time(), tzinfo=UTC),
            ))
        if status in {"interview", "final_round"} and application.id not in plans:
            _add(recommendations, _rec(
                f"prep-plan:{application.id}", "generate_prep_plan", "Generate an interview prep plan",
                f"{application.company} - {application.role} is active without a saved prep plan.",
                "high", "Generate plan", f"/applications?open={application.id}&action=prep",
                ["ACTIVE_INTERVIEW_NO_PREP_PLAN"], [str(application.id)], now, application.id,
            ))
        if status in {"applied", "oa", "interview", "final_round"} and days_stale >= (3 if status in {"interview", "final_round"} else 10):
            _add(recommendations, _rec(
                f"follow-up:{application.id}:{updated.date().isoformat()}", "follow_up", "Follow up on a stale application",
                f"{application.company} - {application.role} has had no meaningful activity for {days_stale} days.",
                "high" if status in {"interview", "final_round"} else "medium", "Draft follow-up",
                f"/applications?open={application.id}&copilot=follow-up",
                ["STALE_ACTIVE_APPLICATION"], [str(application.id)], now, application.id,
            ))
    for suggestion in snapshot.gmail_suggestions:
        due = suggestion.suggested_deadline_at or suggestion.suggested_event_at
        if due is not None and _utc(due) <= now + timedelta(days=3):
            _add(recommendations, _rec(
                f"gmail-review:{suggestion.id}:{suggestion.version}", "gmail_review",
                "Review an urgent Gmail suggestion",
                "Confirm the detected recruiting deadline before it changes your workspace.",
                "urgent", "Review suggestion", "/integrations/gmail",
                ["UNCONFIRMED_GMAIL_DEADLINE"], [str(suggestion.id)], now, suggestion.application_id, _utc(due),
            ))
    recent_apps = sum(_utc(row.created_at) >= now - timedelta(days=10) for row in snapshot.applications)
    if len(snapshot.applications) >= 3 and recent_apps == 0:
        _add(recommendations, _rec(
            "application-cadence:10d", "application_cadence", "Resume application activity",
            "No applications were added in the last 10 days.", "medium", "Add application",
            "/applications?action=add", ["NO_APPLICATIONS_10_DAYS"], [], now,
        ))
    recent_coding = sum(_utc(row.updated_at) >= now - timedelta(days=7) for row in snapshot.coding_activity)
    if (snapshot.coding_activity or snapshot.coding_problems) and recent_coding == 0:
        _add(recommendations, _rec(
            "coding-inactivity:7d", "coding_practice", "Complete a coding practice session",
            "Coding activity has been quiet for seven days.", "medium", "Open prep",
            "/prep?tab=coding", ["NO_CODING_7_DAYS"], [], now,
        ))
    weakness_counts: dict[str, int] = {}
    for analysis in snapshot.analyses:
        for weakness in analysis.risks[:8]:
            key = weakness.strip().lower()
            if key:
                weakness_counts[key] = weakness_counts.get(key, 0) + 1
    repeated = next((key for key, count in sorted(weakness_counts.items(), key=lambda item: (-item[1], item[0])) if count >= 2), None)
    if repeated:
        _add(recommendations, _rec(
            f"resume-weakness:{repeated[:80]}", "resume_weakness", "Address a recurring resume weakness",
            repeated.capitalize(), "medium", "Review resumes", "/resumes",
            ["REPEATED_RESUME_WEAKNESS"], [], now,
        ))
    return sorted(recommendations.values(), key=lambda row: (-PRIORITY_ORDER[row.priority], row.key))


def _rec(key: str, type_: str, title: str, summary: str, priority: str, action: str, route: str,
         reasons: list[str], sources: list[str], now: datetime, application_id=None, expires_at=None) -> CareerRecommendation:
    return CareerRecommendation(key=key, type=type_, title=title, summary=summary, priority=priority,
        action_label=action, action_route=route, confidence=0.85, reason_codes=reasons,
        source_ids=sources, application_id=application_id, expires_at=expires_at, created_at=now)


def _add(items: dict[str, CareerRecommendation], item: CareerRecommendation) -> None:
    items.setdefault(item.key, item)


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
