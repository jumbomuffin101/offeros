from datetime import UTC, datetime
from typing import Any

from app.models.resume import ResumeAnalysis, ResumeVersion


def _safe_text(value: object, default: str = "") -> str:
    return default if value is None else str(value)


def _safe_string_list(value: object, *, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None][:limit]


def latest_analysis_summary_values(analysis: ResumeAnalysis | None) -> dict[str, Any]:
    """Return a response-safe latest-analysis overlay without mutating a resume."""
    if analysis is None:
        return {
            "keyword_match_score": 0,
            "strengths": [],
            "weaknesses": [],
            "missing_keywords": [],
            "suggested_improvement": "",
            "last_analyzed_at": None,
            "latest_analysis_id": None,
            "latest_overall_score": None,
            "latest_analysis_target_role": "",
            "latest_analysis_company": "",
            "analysis_status": "",
        }

    recommendations = _safe_string_list(getattr(analysis, "recommendations", None), limit=12)
    return {
        "keyword_match_score": getattr(analysis, "keyword_score", 0),
        "strengths": _safe_string_list(getattr(analysis, "strengths", None), limit=12),
        "weaknesses": _safe_string_list(getattr(analysis, "risks", None), limit=12),
        "missing_keywords": _safe_string_list(getattr(analysis, "missing_keywords", None), limit=30),
        "suggested_improvement": recommendations[0] if recommendations else _safe_text(getattr(analysis, "summary", None)),
        "last_analyzed_at": getattr(analysis, "created_at", None),
        "latest_analysis_id": getattr(analysis, "id", None),
        "latest_overall_score": getattr(analysis, "overall_score", None),
        "latest_analysis_target_role": _safe_text(getattr(analysis, "target_role", None)),
        "latest_analysis_company": _safe_text(getattr(analysis, "company_name", None)),
        "analysis_status": _safe_text(getattr(analysis, "status", None)),
    }


def apply_latest_analysis_summary(resume: ResumeVersion, analysis: ResumeAnalysis) -> None:
    resume.keyword_match_score = analysis.keyword_score
    resume.strengths = list(analysis.strengths or [])[:12]
    resume.weaknesses = list(analysis.risks or [])[:12]
    resume.missing_keywords = list(analysis.missing_keywords or [])[:30]
    resume.suggested_improvement = next(iter(analysis.recommendations or []), analysis.summary or "")
    resume.last_analyzed_at = analysis.created_at or datetime.now(UTC)
    resume.latest_analysis_id = analysis.id
    resume.latest_overall_score = analysis.overall_score
    resume.latest_analysis_target_role = analysis.target_role
    resume.latest_analysis_company = analysis.company_name
    resume.analysis_status = analysis.status


def clear_latest_analysis_summary(resume: ResumeVersion) -> None:
    resume.keyword_match_score = 0
    resume.strengths = []
    resume.weaknesses = []
    resume.missing_keywords = []
    resume.suggested_improvement = ""
    resume.last_analyzed_at = None
    resume.latest_analysis_id = None
    resume.latest_overall_score = None
    resume.latest_analysis_target_role = ""
    resume.latest_analysis_company = ""
    resume.analysis_status = ""


def summary_matches_analysis(resume: ResumeVersion, analysis: ResumeAnalysis) -> bool:
    return (
        resume.latest_analysis_id == analysis.id
        and resume.keyword_match_score == analysis.keyword_score
        and list(resume.strengths or []) == list(analysis.strengths or [])[:12]
        and list(resume.weaknesses or []) == list(analysis.risks or [])[:12]
        and list(resume.missing_keywords or []) == list(analysis.missing_keywords or [])[:30]
        and resume.suggested_improvement == next(iter(analysis.recommendations or []), analysis.summary or "")
        and resume.latest_overall_score == analysis.overall_score
        and resume.last_analyzed_at == analysis.created_at
        and resume.latest_analysis_target_role == analysis.target_role
        and resume.latest_analysis_company == analysis.company_name
        and resume.analysis_status == analysis.status
    )


def has_analysis_summary(resume: ResumeVersion) -> bool:
    return bool(
        resume.latest_analysis_id
        or resume.last_analyzed_at
        or resume.latest_overall_score is not None
        or resume.analysis_status
        or resume.keyword_match_score
        or resume.strengths
        or resume.weaknesses
        or resume.missing_keywords
        or resume.suggested_improvement
    )
