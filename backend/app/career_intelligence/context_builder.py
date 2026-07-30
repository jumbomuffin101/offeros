from collections import Counter
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.career_intelligence.health import calculate_health
from app.career_intelligence.observations import CareerObservationService
from app.career_intelligence.recommendations import generate_recommendations
from app.career_intelligence.repository import CareerIntelligenceRepository, CareerSnapshot
from app.career_intelligence.schemas import CareerContext, CareerObservationResponse
from app.career_intelligence.trends import count_trend, score_trend, status_ratio_trend


class CareerContextBuilder:
    def __init__(self, repository: CareerIntelligenceRepository) -> None:
        self.repository = repository

    def build(self, user_id: UUID) -> CareerContext:
        now = self.repository.now
        snapshot = self.repository.snapshot(user_id)
        applications = self._applications(snapshot, now)
        resumes = self._resumes(snapshot)
        prep = self._prep(snapshot, now)
        gmail = self._gmail(snapshot, now)
        metrics = {
            "active_applications": applications["active"],
            "recent_applications": applications["recent_count"],
            "stale_follow_ups": len(applications["stale_follow_ups"]),
            "urgent_deadlines": len(applications["upcoming_deadlines"]),
            "coding_completed_14d": prep["coding"]["completed_14d"],
            "behavioral_completed": prep["behavioral"]["completed"],
            "system_design_completed": prep["system_design"]["completed"],
        }
        health = calculate_health(snapshot, metrics)
        recommendations = generate_recommendations(snapshot, now)
        observation_rows = CareerObservationService(self.repository.db, now).reconcile(user_id, snapshot)
        observations = [
            CareerObservationResponse(
                id=row.id, observation_type=row.observation_type, title=row.title,
                summary=row.summary, confidence=row.confidence, source_type=row.source_type,
                source_ids=row.source_ids_json or [], evidence=row.evidence_json or [],
                status=row.status, first_observed_at=row.first_observed_at,
                last_confirmed_at=row.last_confirmed_at, expires_at=row.expires_at,
            ) for row in observation_rows
        ]
        settings = snapshot.settings
        goals = {
            "applications": settings.weekly_application_goal if settings else 5,
            "coding": settings.weekly_coding_goal if settings else 5,
            "mock_interviews": settings.weekly_mock_interview_goal if settings else 2,
            "follow_ups": settings.weekly_follow_up_goal if settings else 3,
        }
        return CareerContext(
            generated_at=now,
            user_id=user_id,
            applications=applications,
            resumes=resumes,
            prep=prep,
            gmail=gmail,
            goals=goals,
            recent_activity=self._activity(snapshot),
            observations=observations,
            recommendations=recommendations,
            career_health=health,
            trends={
                "application_cadence": count_trend(snapshot.applications, now, "created_at"),
                "response_rate": status_ratio_trend(
                    snapshot.applications,
                    now,
                    {"oa", "interview", "final_round", "offer", "rejected"},
                ),
                "interview_conversion": status_ratio_trend(
                    snapshot.applications,
                    now,
                    {"interview", "final_round", "offer"},
                ),
                "coding_activity": count_trend(snapshot.coding_activity, now),
                "behavioral_practice": count_trend(snapshot.behavioral, now),
                "system_design_practice": count_trend(snapshot.system_design, now),
                "mock_interview_scores": score_trend(snapshot.mock_interviews, now, "overall_score"),
                "resume_analysis_scores": score_trend(snapshot.analyses, now, "overall_score"),
            },
            sections={
                "applications": "ready",
                "resumes": "ready",
                "prep": "ready",
                "gmail": gmail["status"],
                "observations": "ready",
            },
        )

    def _applications(self, snapshot: CareerSnapshot, now: datetime) -> dict[str, object]:
        by_status = Counter(row.status.value for row in snapshot.applications)
        active_statuses = {"applying", "applied", "oa", "interview", "final_round"}
        deadlines = sorted(
            [row for row in snapshot.applications if row.deadline and now.date() <= row.deadline <= now.date() + timedelta(days=14)],
            key=lambda row: (row.deadline, row.company.lower(), row.role.lower()),
        )
        stale = sorted(
            [row for row in snapshot.applications if row.status.value in active_statuses
             and now - _utc(row.meaningful_updated_at or row.updated_at) >= timedelta(days=10)],
            key=lambda row: (_utc(row.meaningful_updated_at or row.updated_at), str(row.id)),
        )
        recent = sorted(snapshot.applications, key=lambda row: (_utc(row.updated_at), str(row.id)), reverse=True)[:12]
        return {
            "total": len(snapshot.applications),
            "active": sum(count for status, count in by_status.items() if status in active_statuses),
            "by_status": dict(sorted(by_status.items())),
            "recent_count": sum(_utc(row.created_at) >= now - timedelta(days=7) for row in snapshot.applications),
            "recent": [self._application_summary(row) for row in recent],
            "upcoming_deadlines": [self._application_summary(row) for row in deadlines[:12]],
            "stale_follow_ups": [self._application_summary(row) for row in stale[:12]],
        }

    def _application_summary(self, row: object) -> dict[str, object]:
        return {"id": str(row.id), "company": row.company, "role": row.role, "status": row.status.value,
                "priority": row.priority.value, "deadline": row.deadline.isoformat() if row.deadline else None,
                "updated_at": _utc(row.updated_at).isoformat()}

    def _resumes(self, snapshot: CareerSnapshot) -> dict[str, object]:
        latest = snapshot.analyses[0] if snapshot.analyses else None
        best = max(snapshot.resumes, key=lambda row: row.latest_overall_score or -1, default=None)
        strengths = Counter(value for row in snapshot.analyses for value in row.strengths)
        weaknesses = Counter(value for row in snapshot.analyses for value in row.risks)
        return {
            "total": len(snapshot.resumes),
            "latest_analysis_summary": {
                "id": str(latest.id), "overall_score": latest.overall_score,
                "target_role": latest.target_role, "company_name": latest.company_name,
            } if latest else None,
            "best_performing_resume": {
                "id": str(best.id), "name": best.name, "score": best.latest_overall_score,
            } if best and best.latest_overall_score is not None else None,
            "common_strengths": [value for value, _ in strengths.most_common(5)],
            "common_weaknesses": [value for value, _ in weaknesses.most_common(5)],
        }

    def _prep(self, snapshot: CareerSnapshot, now: datetime) -> dict[str, object]:
        recent = now - timedelta(days=14)
        completed = lambda rows: sum(getattr(row.status, "value", row.status) == "completed" for row in rows)
        return {
            "coding": {"total": len(snapshot.coding_problems), "completed": completed(snapshot.coding_problems),
                       "completed_14d": sum(_utc(row.updated_at) >= recent for row in snapshot.coding_activity)},
            "behavioral": {"total": len(snapshot.behavioral), "completed": completed(snapshot.behavioral)},
            "system_design": {"total": len(snapshot.system_design), "completed": completed(snapshot.system_design)},
            "mock_interviews": {"total": len(snapshot.mock_interviews),
                                "completed": sum(row.status == "completed" for row in snapshot.mock_interviews),
                                "latest_score": next((row.overall_score for row in snapshot.mock_interviews if row.overall_score is not None), None)},
        }

    def _gmail(self, snapshot: CareerSnapshot, now: datetime) -> dict[str, object]:
        connection = snapshot.gmail_connection
        status = "not_connected" if connection is None or connection.status == "disconnected" else connection.status
        urgent = [row for row in snapshot.gmail_suggestions
                  if (row.suggested_deadline_at or row.suggested_event_at)
                  and _utc(row.suggested_deadline_at or row.suggested_event_at) <= now + timedelta(days=3)]
        return {"status": status, "pending_suggestions": len(snapshot.gmail_suggestions),
                "urgent_deadlines": [{"id": str(row.id), "application_id": str(row.application_id) if row.application_id else None,
                                      "due_at": _utc(row.suggested_deadline_at or row.suggested_event_at).isoformat()}
                                     for row in urgent[:10]]}

    def _activity(self, snapshot: CareerSnapshot) -> list[dict[str, object]]:
        rows: list[tuple[datetime, dict[str, object]]] = []
        for kind, group in (("application", snapshot.applications), ("resume_analysis", snapshot.analyses),
                            ("coding", snapshot.coding_activity), ("mock_interview", snapshot.mock_interviews)):
            for row in group[:20]:
                at = _utc(row.updated_at)
                rows.append((at, {"type": kind, "id": str(row.id), "timestamp": at.isoformat()}))
        return [value for _, value in sorted(rows, key=lambda item: item[0], reverse=True)[:20]]


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
