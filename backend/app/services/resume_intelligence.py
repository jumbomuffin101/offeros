from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime, timedelta
import logging
import re
from time import perf_counter
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.career_intelligence.service import CareerIntelligenceService
from app.models.application import Application
from app.models.career_intelligence import CareerObservation
from app.models.mock_interview import MockInterviewSession
from app.models.resume import ResumeAnalysis, ResumeVersion
from app.schemas.resume_analysis import (
    ResumeAnalysisComparison,
    ResumeAnalysisResult,
    ResumeIntelligence,
    ResumeObservationSummary,
    ResumePerformanceSummary,
)


INTELLIGENCE_VERSION = "resume-intelligence-v1"
ANALYSIS_SCHEMA_VERSION = "resume-analysis-v1"
MIN_OUTCOME_SAMPLE = 5
MAX_COMPARABLE_HISTORY = 12
logger = logging.getLogger(__name__)


def role_family(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9 ]", " ", value.lower())
    if any(token in normalized for token in ("backend", "platform", "infrastructure", "distributed")):
        return "backend"
    if any(token in normalized for token in ("frontend", "front end", "react", "web")):
        return "frontend"
    if any(token in normalized for token in ("data", "machine learning", " ml ", "ai ")):
        return "data_ml"
    if any(token in normalized for token in ("mobile", "ios", "android")):
        return "mobile"
    if "security" in normalized:
        return "security"
    return "general_swe"


def analysis_mode(application: Application | None, target_role: str, job_description: str) -> str:
    if application is not None:
        return "application"
    if target_role.strip() and job_description.strip():
        return "target_role"
    return "general"


def _intelligence(analysis: ResumeAnalysis) -> dict[str, Any]:
    value = analysis.intelligence_json
    return value if isinstance(value, dict) else {}


class ResumeCareerContextBuilder:
    """Build a small, sanitized projection for resume analysis prompts."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def build(
        self,
        user_id: UUID,
        resume: ResumeVersion,
        *,
        target_role: str,
        company_name: str,
        application: Application | None,
        mode: str,
    ) -> dict[str, Any]:
        started = perf_counter()
        context = CareerIntelligenceService(self.db).context(user_id)
        recent_analyses = list(
            self.db.scalars(
                select(ResumeAnalysis)
                .where(
                    ResumeAnalysis.user_id == user_id,
                    ResumeAnalysis.resume_version_id == resume.id,
                    ResumeAnalysis.deleted_at.is_(None),
                    ResumeAnalysis.status == "completed",
                )
                .order_by(ResumeAnalysis.created_at.desc())
                .limit(MAX_COMPARABLE_HISTORY)
            )
        )
        active_observations = list(
            self.db.scalars(
                select(CareerObservation)
                .where(
                    CareerObservation.user_id == user_id,
                    CareerObservation.status == "active",
                    CareerObservation.observation_type.in_(
                        ["resume_weakness", "resume_strength", "resume_improvement", "interview_weakness", "interview_strength"]
                    ),
                )
                .order_by(CareerObservation.last_confirmed_at.desc())
                .limit(30)
            )
        )
        mock_signals = self._mock_signals(user_id, resume.id)
        performance = calculate_resume_performance(
            self.db, user_id, resume.id, role_family(target_role)
        )
        projection = {
            "version": INTELLIGENCE_VERSION,
            "generated_at": context.generated_at.isoformat(),
            "analysis_mode": mode,
            "target": {
                "application_id": str(application.id) if application else None,
                "company": company_name[:200],
                "role": target_role[:200],
                "role_family": role_family(target_role),
                "priority": application.priority.value if application else None,
                "status": application.status.value if application else None,
            },
            "resume": {
                "id": str(resume.id),
                "name": resume.name,
                "target_role": resume.target_role,
                "status": resume.status.value,
                "updated_at": resume.updated_at.isoformat(),
                "analysis_count": len(recent_analyses),
            },
            "recent_analyses": [
                {
                    "id": str(row.id),
                    "target_role": row.target_role,
                    "company": row.company_name,
                    "role_family": role_family(row.target_role),
                    "scores": {
                        "overall": row.overall_score,
                        "keyword": row.keyword_score,
                        "impact": row.impact_score,
                        "clarity": row.clarity_score,
                        "technical_depth": row.technical_depth_score,
                    },
                    "strengths": list(row.strengths or [])[:5],
                    "risks": list(row.risks or [])[:5],
                    "missing_keywords": list(row.missing_keywords or [])[:10],
                    "created_at": row.created_at.isoformat(),
                }
                for row in recent_analyses
            ],
            "active_observations": [
                {
                    "type": row.observation_type,
                    "summary": row.summary[:300],
                    "confidence": row.confidence,
                    "scope": _observation_scope(row),
                }
                for row in active_observations
            ],
            "mock_interview_signals": mock_signals,
            "application_outcomes": performance.model_dump(),
            "resume_readiness": context.career_health.subscores.get("resume_readiness"),
            "active_recommendations": [
                {
                    "key": row.key,
                    "title": row.title,
                    "summary": row.summary,
                    "priority": row.priority,
                }
                for row in context.recommendations
                if row.type.startswith("resume") or "resume" in row.reason_codes
            ][:8],
        }
        logger.info(
            "resume_intelligence.context_projection_built duration_ms=%d analysis_count=%d observation_count=%d",
            round((perf_counter() - started) * 1000),
            len(recent_analyses),
            len(active_observations),
        )
        return projection

    def _mock_signals(self, user_id: UUID, resume_id: UUID) -> list[dict[str, Any]]:
        rows = list(
            self.db.scalars(
                select(MockInterviewSession)
                .where(
                    MockInterviewSession.user_id == user_id,
                    MockInterviewSession.resume_version_id == resume_id,
                    MockInterviewSession.status == "completed",
                )
                .order_by(MockInterviewSession.updated_at.desc())
                .limit(10)
            )
        )
        result: list[dict[str, Any]] = []
        for row in rows:
            for item in row.observation_summary_json or []:
                if not isinstance(item, dict):
                    continue
                dimension = str(item.get("dimension") or "")
                if not any(token in dimension for token in ("resume", "project", "experience", "impact", "ownership")):
                    continue
                result.append(
                    {
                        "session_id": str(row.id),
                        "type": str(item.get("type") or ""),
                        "dimension": dimension[:80],
                        "summary": str(item.get("summary") or "")[:300],
                        "confidence": float(item.get("confidence") or 0),
                    }
                )
        return result[:10]


def find_comparable_analysis(
    analyses: list[ResumeAnalysis],
    *,
    current_mode: str,
    target_role: str,
    application_id: UUID | None,
) -> tuple[ResumeAnalysis | None, Literal["comparable", "partially_comparable", "not_comparable"], list[str], float]:
    target_family = role_family(target_role)
    partial: ResumeAnalysis | None = None
    partial_basis: list[str] = []
    for prior in analyses:
        metadata = _intelligence(prior)
        prior_mode = str(metadata.get("analysis_mode") or "target_role")
        prior_schema = str(metadata.get("analysis_schema_version") or ANALYSIS_SCHEMA_VERSION)
        if prior_schema != ANALYSIS_SCHEMA_VERSION:
            continue
        prior_application = str(metadata.get("application_id") or "")
        if current_mode == "application":
            if application_id and prior_application == str(application_id):
                return prior, "comparable", ["same_resume", "same_application", "compatible_schema"], 0.95
            if prior_mode != "application":
                continue
        elif prior_mode != current_mode:
            continue
        if prior.target_role.strip().casefold() == target_role.strip().casefold():
            return prior, "comparable", ["same_resume", "same_analysis_mode", "same_target_role", "compatible_schema"], 0.9
        if role_family(prior.target_role) == target_family and partial is None:
            partial = prior
            partial_basis = ["same_resume", "same_analysis_mode", "same_role_family", "compatible_schema"]
    if partial is not None:
        return partial, "partially_comparable", partial_basis, 0.65
    return None, "not_comparable", ["no_compatible_prior_analysis"], 0


def build_comparison(
    prior: ResumeAnalysis | None,
    result: ResumeAnalysisResult,
    status: str,
    basis: list[str],
    confidence: float,
) -> ResumeAnalysisComparison:
    if prior is None:
        return ResumeAnalysisComparison(status="not_comparable", basis=basis, confidence=confidence)
    dimensions = {
        "overall": (prior.overall_score, result.overall_score),
        "keyword": (prior.keyword_score, result.keyword_score),
        "impact": (prior.impact_score, result.impact_score),
        "clarity": (prior.clarity_score, result.clarity_score),
        "technical_depth": (prior.technical_depth_score, result.technical_depth_score),
        "experience_match": (prior.experience_match_score, result.experience_match_score),
    }
    improved = [key for key, (old, new) in dimensions.items() if new - old >= 3]
    declined = [key for key, (old, new) in dimensions.items() if new - old <= -3]
    unchanged = [key for key in dimensions if key not in improved and key not in declined]
    return ResumeAnalysisComparison(
        status=status,
        basis=basis,
        comparison_analysis_id=prior.id,
        overall_delta=result.overall_score - prior.overall_score,
        keyword_delta=result.keyword_score - prior.keyword_score,
        improved_areas=improved,
        declined_areas=declined,
        unchanged_areas=unchanged,
        confidence=confidence,
    )


def deterministic_signals(
    resume: ResumeVersion,
    resume_text: str,
    comparable: list[ResumeAnalysis],
    performance: ResumePerformanceSummary,
    application: Application | None,
) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    bullets = [line.strip() for line in resume_text.splitlines() if line.strip().startswith(("-", "*", "•"))]
    quantified = [line for line in bullets if re.search(r"\d", line)]
    if bullets and not quantified:
        signals.append({"code": "NO_QUANTIFIED_BULLETS", "summary": "No resume bullets contain quantified evidence.", "confidence": 0.98})
    keyword_counts = Counter(
        keyword.strip().lower()
        for row in comparable
        for keyword in (row.missing_keywords or [])
        if keyword.strip()
    )
    repeated = [keyword for keyword, count in keyword_counts.most_common(8) if count >= 2]
    if repeated:
        signals.append({"code": "RECURRING_KEYWORD_GAP", "summary": "Keywords recur across comparable analyses.", "keywords": repeated, "confidence": 0.9})
    updated_at = resume.updated_at if resume.updated_at.tzinfo else resume.updated_at.replace(tzinfo=UTC)
    if datetime.now(UTC) - updated_at >= timedelta(days=90):
        signals.append({"code": "STALE_RESUME_VERSION", "summary": "This resume version has not been updated in at least 90 days.", "confidence": 1.0})
    if performance.status == "sufficient" and (performance.interview_rate or 0) < 0.1:
        signals.append({"code": "WEAK_INTERVIEW_CONVERSION", "summary": "Interview conversion is below 10% for a sufficient sample.", "sample_size": performance.sample_size, "confidence": 0.8})
    if application is not None and application.priority.value == "high" and application.resume_analysis_id is None:
        signals.append({"code": "HIGH_PRIORITY_APPLICATION_UNANALYZED", "summary": "A high-priority application did not yet have a resume analysis.", "confidence": 1.0})
    return signals


def calculate_resume_performance(
    db: Session, user_id: UUID, resume_id: UUID, target_role_family: str
) -> ResumePerformanceSummary:
    rows = list(
        db.scalars(
            select(Application).where(
                Application.user_id == user_id,
                Application.resume_version_id == resume_id,
                Application.deleted_at.is_(None),
            )
        )
    )
    similar = [row for row in rows if role_family(row.role) == target_role_family]
    considered = similar if similar else rows
    submitted = [row for row in considered if row.status.value not in {"wishlist", "applying"}]
    total = len(submitted)
    response = sum(row.status.value in {"oa", "interview", "final_round", "offer", "rejected"} for row in submitted)
    oa = sum(row.status.value in {"oa", "interview", "final_round", "offer"} for row in submitted)
    interview = sum(row.status.value in {"interview", "final_round", "offer"} for row in submitted)
    offer = sum(row.status.value == "offer" for row in submitted)
    sufficient = total >= MIN_OUTCOME_SAMPLE
    return ResumePerformanceSummary(
        status="sufficient" if sufficient else "insufficient_data",
        sample_size=total,
        response_count=response,
        oa_count=oa,
        interview_count=interview,
        offer_count=offer,
        response_rate=response / total if sufficient else None,
        oa_rate=oa / total if sufficient else None,
        interview_rate=interview / total if sufficient else None,
        offer_rate=offer / total if sufficient else None,
        role_family=target_role_family,
        statement=(
            f"This resume reached interviews in {interview} of {total} {target_role_family.replace('_', ' ')} applications. "
            "This is correlation, not evidence that the resume caused the outcomes."
            if sufficient
            else f"{total} comparable submitted applications; {MIN_OUTCOME_SAMPLE} are required before showing performance rates."
        ),
    )


def build_resume_intelligence(
    *,
    result: ResumeAnalysisResult,
    resume: ResumeVersion,
    context: dict[str, Any],
    prior: ResumeAnalysis | None,
    comparison_status: str,
    comparison_basis: list[str],
    comparison_confidence: float,
    signals: list[dict[str, Any]],
    performance: ResumePerformanceSummary,
    mode: str,
    application: Application | None,
    simulated: bool,
) -> ResumeIntelligence:
    comparison = build_comparison(prior, result, comparison_status, comparison_basis, comparison_confidence)
    prior_rows = context.get("recent_analyses") if isinstance(context.get("recent_analyses"), list) else []
    strength_counts = Counter(item.strip().lower() for item in result.strengths if item.strip())
    weakness_counts = Counter(item.strip().lower() for item in result.risks if item.strip())
    keyword_counts = Counter(item.strip().lower() for item in result.missing_keywords if item.strip())
    for row in prior_rows:
        if not isinstance(row, dict):
            continue
        strength_counts.update(str(item).strip().lower() for item in row.get("strengths", []) if str(item).strip())
        weakness_counts.update(str(item).strip().lower() for item in row.get("risks", []) if str(item).strip())
        keyword_counts.update(str(item).strip().lower() for item in row.get("missing_keywords", []) if str(item).strip())
    recurring_strengths = [value for value, count in strength_counts.most_common(6) if count >= 2]
    recurring_weaknesses = [value for value, count in weakness_counts.most_common(6) if count >= 2]
    candidates: list[ResumeObservationSummary] = []
    scope = "application" if application else "resume_version"
    scope_id = str(application.id if application else resume.id)
    for value in recurring_strengths:
        candidates.append(ResumeObservationSummary(type="resume_strength", scope=scope, dimension="strength", summary=value.capitalize(), confidence=min(0.95, 0.65 + strength_counts[value] * 0.08), source_ids=[scope_id]))
    for value in recurring_weaknesses:
        candidates.append(ResumeObservationSummary(type="resume_weakness", scope=scope, dimension="quality", summary=value.capitalize(), confidence=min(0.95, 0.65 + weakness_counts[value] * 0.08), source_ids=[scope_id]))
    for value, count in keyword_counts.most_common(6):
        if count >= 2:
            candidates.append(ResumeObservationSummary(type="resume_weakness", scope="role_family" if application else "resume_version", dimension=f"keyword:{value}"[:80], summary=f"{value} is repeatedly missing in comparable analyses.", confidence=min(0.92, 0.62 + count * 0.08), source_ids=[scope_id]))
    for signal in signals:
        if signal.get("code") == "NO_QUANTIFIED_BULLETS":
            candidates.append(ResumeObservationSummary(type="resume_weakness", scope="resume_version", dimension="quantified_impact", summary="Project or experience bullets lack quantified outcomes.", confidence=0.9, source_ids=[str(resume.id)]))
    recommendations = _recommendations(resume, result, signals, application)
    health_delta = max(-4, min(4, round((result.overall_score - 70) / 8)))
    return ResumeIntelligence(
        version=INTELLIGENCE_VERSION,
        analysis_schema_version=ANALYSIS_SCHEMA_VERSION,
        analysis_mode=mode,
        application_id=application.id if application else None,
        context_generated_at=datetime.fromisoformat(str(context["generated_at"])) if context.get("generated_at") else datetime.now(UTC),
        comparison=comparison,
        deterministic_signals=signals,
        recurring_strengths=recurring_strengths,
        recurring_weaknesses=recurring_weaknesses,
        observation_candidates=candidates[:12],
        recommendations=recommendations,
        performance=performance,
        career_health_impact={"resume_readiness_delta": health_delta, "bounded_to": 4, "reason": "Latest completed analysis; company-specific gaps have limited global weight."},
        status="ready",
        simulated=simulated,
    )


def _recommendations(
    resume: ResumeVersion,
    result: ResumeAnalysisResult,
    signals: list[dict[str, Any]],
    application: Application | None,
) -> list[dict[str, Any]]:
    output: dict[str, dict[str, Any]] = {}
    if any(row.get("code") == "NO_QUANTIFIED_BULLETS" for row in signals):
        output[f"resume:quantify:{resume.id}"] = {"key": f"resume:quantify:{resume.id}", "title": "Quantify two resume bullets", "summary": "Add truthful scope or outcome metrics to two project or experience bullets.", "priority": "high", "route": f"/resumes?open={resume.id}", "scope": "resume_version"}
    if result.missing_keywords:
        family = role_family(application.role if application else resume.target_role)
        output[f"resume:keywords:{resume.id}:{family}"] = {"key": f"resume:keywords:{resume.id}:{family}", "title": "Review role-specific keywords", "summary": f"Add accurate coverage for {', '.join(result.missing_keywords[:3])}; do not add skills you do not have.", "priority": "medium", "route": f"/resumes?open={resume.id}", "scope": "application" if application else "role_family"}
    if application is not None:
        output[f"resume:application:{application.id}"] = {"key": f"resume:application:{application.id}", "title": "Apply the resume feedback before submitting", "summary": f"Review the scoped analysis for {application.company} - {application.role}.", "priority": "high" if application.priority.value == "high" else "medium", "route": f"/applications?open={application.id}", "scope": "application"}
    return list(output.values())


def _observation_scope(row: CareerObservation) -> str:
    for item in row.evidence_json or []:
        if isinstance(item, dict) and isinstance(item.get("scope"), str):
            return item["scope"]
    return "career_wide"
