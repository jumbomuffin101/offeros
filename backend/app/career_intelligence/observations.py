from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.career_intelligence.repository import CareerSnapshot
from app.models.career_intelligence import CareerObservation


@dataclass(slots=True)
class ObservationCandidate:
    key: str
    type: str
    title: str
    summary: str
    confidence: float
    source_type: str
    source_ids: list[str]
    evidence: list[dict[str, object]]
    expires_at: datetime | None = None


class CareerObservationService:
    def __init__(self, db: Session, now: datetime) -> None:
        self.db = db
        self.now = _utc(now)

    def reconcile(self, user_id: UUID, snapshot: CareerSnapshot) -> list[CareerObservation]:
        existing = list(self.db.scalars(select(CareerObservation).where(CareerObservation.user_id == user_id)))
        by_key = {row.dedupe_key: row for row in existing}
        candidates = self._candidates(snapshot)
        confirmed: set[str] = set()
        created: list[CareerObservation] = []
        for candidate in candidates:
            if candidate.key in confirmed:
                continue
            confirmed.add(candidate.key)
            row = by_key.get(candidate.key)
            if row is None:
                row = CareerObservation(
                    user_id=user_id,
                    dedupe_key=candidate.key,
                    first_observed_at=self.now,
                    last_confirmed_at=self.now,
                )
                self.db.add(row)
                created.append(row)
                by_key[candidate.key] = row
            elif row.status == "dismissed":
                continue
            row.observation_type = candidate.type
            row.title = candidate.title
            row.summary = candidate.summary
            row.confidence = candidate.confidence
            row.source_type = candidate.source_type
            row.source_ids_json = candidate.source_ids
            row.evidence_json = candidate.evidence
            row.status = "active"
            row.last_confirmed_at = self.now
            row.expires_at = candidate.expires_at
            if candidate.type in {"interview_weakness", "interview_strength"}:
                dimension = candidate.key.rsplit(":", 1)[-1]
                opposite = (
                    f"interview-strength:{dimension}"
                    if candidate.type == "interview_weakness"
                    else f"interview-weakness:{dimension}"
                )
                opposite_row = by_key.get(opposite)
                if opposite_row is not None and opposite_row.status == "active":
                    opposite_row.status = "superseded"
            if candidate.type in {"resume_weakness", "resume_strength"}:
                scope = next((str(item.get("scope")) for item in candidate.evidence if item.get("scope")), "career_wide")
                dimension = next((str(item.get("dimension")) for item in candidate.evidence if item.get("dimension")), "general")
                opposite_type = "resume_strength" if candidate.type == "resume_weakness" else "resume_weakness"
                for opposite_row in existing:
                    if opposite_row.status != "active" or opposite_row.observation_type != opposite_type:
                        continue
                    opposite_evidence = opposite_row.evidence_json or []
                    if any(
                        isinstance(item, dict)
                        and item.get("scope") == scope
                        and item.get("dimension") == dimension
                        for item in opposite_evidence
                    ):
                        opposite_row.status = "superseded"
        for row in existing:
            if row.status == "active" and row.dedupe_key not in confirmed:
                row.status = "expired" if row.expires_at and _utc(row.expires_at) <= self.now else "resolved"
        self.db.flush()
        return sorted(
            [row for row in [*existing, *created] if row.status == "active"],
            key=lambda row: (-row.confidence, row.dedupe_key),
        )

    def list_observations(self, user_id: UUID) -> list[CareerObservation]:
        return list(self.db.scalars(
            select(CareerObservation).where(CareerObservation.user_id == user_id)
            .order_by(CareerObservation.last_confirmed_at.desc()).limit(100)
        ))

    def _candidates(self, snapshot: CareerSnapshot) -> list[ObservationCandidate]:
        result: list[ObservationCandidate] = []
        recent_apps = sum(_utc(row.created_at) >= self.now - timedelta(days=10) for row in snapshot.applications)
        if len(snapshot.applications) >= 3 and recent_apps == 0:
            result.append(ObservationCandidate(
                "application-cadence:inactive-10d", "application_cadence", "Application cadence slowed",
                "No applications were added in the last 10 days.", 0.9, "applications",
                [str(row.id) for row in snapshot.applications[:10]], [{"window_days": 10, "count": 0}],
                self.now + timedelta(days=3),
            ))
        stale = [row for row in snapshot.applications if row.status.value in {"applied", "oa", "interview", "final_round"}
                 and self.now - _utc(row.meaningful_updated_at or row.updated_at) >= timedelta(days=10)]
        if len(stale) >= 2:
            result.append(ObservationCandidate(
                "follow-up-risk:multiple", "follow_up_risk", "Several active applications are stale",
                f"{len(stale)} active applications have no recent meaningful activity.", 0.9,
                "applications", [str(row.id) for row in stale], [{"stale_count": len(stale)}],
                self.now + timedelta(days=2),
            ))
        weakness_counts: dict[str, list[str]] = {}
        for analysis in snapshot.analyses:
            for weakness in analysis.risks[:8]:
                key = weakness.strip().lower()
                if key:
                    weakness_counts.setdefault(key, []).append(str(analysis.id))
        for weakness, ids in sorted(weakness_counts.items()):
            if len(ids) >= 2:
                result.append(ObservationCandidate(
                    f"resume-weakness:{weakness[:100]}", "resume_weakness", "Recurring resume weakness",
                    weakness.capitalize(), min(0.95, 0.65 + len(ids) * 0.1), "resume_analyses",
                    ids[:10], [{"analysis_count": len(ids)}],
                ))
        for analysis in snapshot.analyses:
            intelligence = analysis.intelligence_json if isinstance(analysis.intelligence_json, dict) else {}
            for item in intelligence.get("observation_candidates", []):
                if not isinstance(item, dict):
                    continue
                type_ = str(item.get("type") or "")
                scope = str(item.get("scope") or "resume_version")
                dimension = str(item.get("dimension") or "general")[:80]
                summary = str(item.get("summary") or "").strip()[:300]
                confidence = max(0, min(1, float(item.get("confidence") or 0)))
                if type_ not in {"resume_weakness", "resume_strength", "resume_improvement"} or confidence < 0.72 or not summary:
                    continue
                source_ids = [str(value) for value in item.get("source_ids", []) if value][:8]
                digest = sha256(f"{type_}|{scope}|{dimension}|{summary.lower()}".encode()).hexdigest()[:18]
                result.append(ObservationCandidate(
                    f"resume-intelligence:{scope}:{digest}",
                    type_,
                    "Recurring resume weakness" if type_ == "resume_weakness" else "Consistent resume strength",
                    summary,
                    confidence,
                    "resume_analyses",
                    [str(analysis.id), *source_ids][:10],
                    [{"scope": scope, "dimension": dimension, "analysis_id": str(analysis.id), "schema_version": intelligence.get("analysis_schema_version")}],
                    self.now + timedelta(days=45),
                ))
        scores = [row.overall_score for row in snapshot.mock_interviews if row.status == "completed" and row.overall_score is not None]
        if len(scores) >= 3 and sum(scores[:3]) / 3 < 60:
            result.append(ObservationCandidate(
                "interview-weakness:recent-score", "interview_weakness", "Mock interview scores need attention",
                "The last three completed mock interviews average below 60.", 0.85, "mock_interviews",
                [str(row.id) for row in snapshot.mock_interviews if row.overall_score is not None][:3],
                [{"sample_size": 3, "average": round(sum(scores[:3]) / 3)}],
            ))
        dimension_evidence: dict[tuple[str, str], list[tuple[object, dict[str, object]]]] = {}
        latest_dimension_signal: dict[str, str] = {}
        for session in snapshot.mock_interviews:
            if session.status != "completed":
                continue
            for item in session.observation_summary_json or []:
                if not isinstance(item, dict):
                    continue
                type_ = item.get("type")
                dimension = item.get("dimension")
                if type_ not in {"interview_weakness", "interview_strength", "interview_improvement"}:
                    continue
                if not isinstance(dimension, str) or not dimension:
                    continue
                dimension_evidence.setdefault((type_, dimension), []).append((session, item))
                latest_dimension_signal.setdefault(dimension, type_)
        for (type_, dimension), entries in sorted(dimension_evidence.items()):
            if latest_dimension_signal.get(dimension) != type_:
                continue
            required = 2 if type_ != "interview_improvement" else 1
            evidence_count = sum(int(item.get("evidence_count", 1)) for _, item in entries)
            if evidence_count < required:
                continue
            latest = entries[0][1]
            title = {
                "interview_weakness": "Recurring mock interview weakness",
                "interview_strength": "Consistent mock interview strength",
                "interview_improvement": "Mock interview performance improving",
            }[type_]
            prefix = type_.replace("interview_", "interview-")
            result.append(ObservationCandidate(
                f"{prefix}:{dimension}", type_, title,
                str(latest.get("summary") or f"{dimension.replace('_', ' ').title()} is a recurring interview signal.")[:300],
                min(0.95, max(float(item.get("confidence", 0.5)) for _, item in entries)),
                "mock_interviews", [str(session.id) for session, _ in entries[:5]],
                [{"dimension": dimension, "session_count": len(entries), "evidence_count": evidence_count}],
                self.now + timedelta(days=21),
            ))
        return result


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
