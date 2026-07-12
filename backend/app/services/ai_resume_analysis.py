from __future__ import annotations

import json
import re
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import ValidationError as PydanticValidationError

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.resume_analysis import BulletRewrite, ResumeAnalysisResult, SkillMatch, WeakBullet


ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_score": {"type": "number", "minimum": 0, "maximum": 100},
        "keyword_score": {"type": "number", "minimum": 0, "maximum": 100},
        "impact_score": {"type": "number", "minimum": 0, "maximum": 100},
        "clarity_score": {"type": "number", "minimum": 0, "maximum": 100},
        "technical_depth_score": {"type": "number", "minimum": 0, "maximum": 100},
        "experience_match_score": {"type": "number", "minimum": 0, "maximum": 100},
        "required_skills_match": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {"type": "string"},
                    "status": {"type": "string", "enum": ["strong", "partial", "missing"]},
                    "evidence": {"type": ["string", "null"]},
                },
                "required": ["skill", "status", "evidence"],
            },
        },
        "preferred_skills_match": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {"type": "string"},
                    "status": {"type": "string", "enum": ["strong", "partial", "missing"]},
                    "evidence": {"type": ["string", "null"]},
                },
                "required": ["skill", "status", "evidence"],
            },
        },
        "missing_keywords": {"type": "array", "items": {"type": "string"}},
        "strong_keywords": {"type": "array", "items": {"type": "string"}},
        "weak_bullets": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "original": {"type": "string"},
                    "issue": {"type": "string"},
                    "suggestion": {"type": "string"},
                },
                "required": ["original", "issue", "suggestion"],
            },
        },
        "suggested_bullet_rewrites": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "original": {"type": "string"},
                    "rewrite": {"type": "string"},
                    "why_better": {"type": "string"},
                    "grounded_in_resume": {"type": "boolean"},
                },
                "required": ["original", "rewrite", "why_better", "grounded_in_resume"],
            },
        },
        "strengths": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "recruiter_summary": {"type": "string"},
        "summary": {"type": "string"},
    },
    "required": [
        "overall_score",
        "keyword_score",
        "impact_score",
        "clarity_score",
        "technical_depth_score",
        "experience_match_score",
        "required_skills_match",
        "preferred_skills_match",
        "missing_keywords",
        "strong_keywords",
        "weak_bullets",
        "suggested_bullet_rewrites",
        "strengths",
        "risks",
        "recommendations",
        "recruiter_summary",
        "summary",
    ],
}


class AIProvider(Protocol):
    provider: str
    model: str

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        ...


class MockResumeAnalysisProvider:
    provider = "mock"
    model = "local-mock"

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        lower_resume = resume_text.lower()
        lower_context = f"{target_role} {job_description}".lower()
        keywords = [
            "typescript",
            "react",
            "python",
            "fastapi",
            "postgresql",
            "sql",
            "aws",
            "docker",
            "testing",
            "distributed systems",
            "api",
            "backend",
            "frontend",
            "observability",
        ]
        desired = [keyword for keyword in keywords if keyword in lower_context] or ["api", "testing", "system design"]
        strong = [keyword for keyword in keywords if keyword in lower_resume][:8]
        missing = [keyword for keyword in desired if keyword not in lower_resume][:8]
        has_metrics = any(character.isdigit() for character in resume_text)
        weak_sources = [
            line.strip("-* ").strip()
            for line in resume_text.splitlines()
            if line.strip().startswith(("-", "*")) and not any(char.isdigit() for char in line)
        ][:3]
        weak_bullets = [
            WeakBullet(
                original=bullet,
                issue="This bullet lacks measurable scope or impact.",
                suggestion="Add the system, technology, ownership, and quantified result.",
            )
            for bullet in weak_sources
        ]
        return ResumeAnalysisResult(
            overall_score=74 + min(len(strong) * 2, 12) - len(missing) * 3 + (6 if has_metrics else 0),
            keyword_score=72 + len(strong) * 3 - len(missing) * 4,
            impact_score=86 if has_metrics else 62,
            clarity_score=78 if len(resume_text) < 8000 else 68,
            technical_depth_score=70
            + len([item for item in strong if item in {"fastapi", "postgresql", "docker", "distributed systems", "aws"}]) * 5,
            experience_match_score=70 + min(len(strong) * 3, 18) - len(missing) * 2,
            required_skills_match=[
                SkillMatch(skill=keyword, status="strong" if keyword in strong else "missing", evidence=keyword if keyword in strong else None)
                for keyword in desired[:10]
            ],
            preferred_skills_match=[
                SkillMatch(skill=keyword, status="partial" if keyword in strong else "missing", evidence=keyword if keyword in strong else None)
                for keyword in keywords
                if keyword not in desired
            ][:8],
            missing_keywords=missing,
            strong_keywords=strong or ["software engineering", "projects"],
            weak_bullets=weak_bullets,
            suggested_bullet_rewrites=[
                BulletRewrite(
                    original=bullet.original,
                    rewrite=f"Improved {bullet.original.lower()} by clarifying the technology, scope, and measurable result already supported by the resume.",
                    why_better="It keeps the rewrite grounded while prompting the candidate to add a real metric if available.",
                    grounded_in_resume=True,
                )
                for bullet in weak_bullets
            ],
            strengths=[
                "Clear technical recruiting focus.",
                "Relevant engineering keywords are present." if strong else "Baseline software engineering positioning is present.",
            ],
            risks=[
                "Some bullets may need stronger metrics." if not has_metrics else "Keep metrics tied to business or reliability outcomes.",
                "Add role-specific keywords before applying." if missing else "Avoid overloading the resume with unrelated keywords.",
            ],
            recommendations=[
                "Add 2-3 quantified impact statements.",
                "Mirror the target role's core technologies where accurate.",
                "Prioritize project bullets that show production-quality engineering judgment.",
            ],
            recruiter_summary="Simulated local analysis. Use production AI mode for real recruiter-style review.",
            summary="Local mock analysis generated because AI_MOCK_ENABLED is true. Use it for UX testing, not final resume decisions.",
        )


class OpenRouterProvider:
    provider = "openrouter"

    def __init__(self, api_key: str, model: str, timeout_seconds: int = 60) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        messages = [
            {"role": "system", "content": RESUME_ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "target_role": target_role,
                        "job_description": job_description,
                        "resume_text": resume_text,
                        "required_json_schema": ANALYSIS_SCHEMA,
                    },
                    ensure_ascii=False,
                ),
            },
        ]
        first = self._complete_with_retry(messages)
        try:
            return parse_analysis_result(first)
        except AppError:
            repair = self._complete_with_retry([
                {"role": "system", "content": JSON_REPAIR_SYSTEM_PROMPT},
                {"role": "user", "content": first},
            ])
            return parse_analysis_result(repair)

    def _complete_with_retry(self, messages: list[dict[str, str]]) -> str:
        try:
            return self._complete(messages)
        except AppError as exc:
            if exc.status_code not in {502, 503, 504}:
                raise
            return self._complete(messages)

    def _complete(self, messages: list[dict[str, str]]) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        request = Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://offeros.app",
                "X-Title": "OfferOS Resume Intelligence",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429:
                raise AppError("ai_rate_limited", "OpenRouter is rate limited. Try again later.", 429) from exc
            if exc.code in {404, 410}:
                raise AppError("ai_model_unavailable", "The configured OpenRouter model is unavailable. Update AI_MODEL on the backend.", 503) from exc
            raise AppError("ai_provider_error", "OpenRouter could not complete the resume analysis.", 502, detail) from exc
        except (TimeoutError, URLError, OSError) as exc:
            raise AppError("ai_provider_unavailable", "OpenRouter timed out or is unavailable. Try again in a moment.", 503) from exc
        return extract_openrouter_content(response_payload)


RESUME_ANALYSIS_SYSTEM_PROMPT = """You are OfferOS Resume Intelligence, a precise technical recruiting assistant for software engineering students.
Evaluate the resume directly against the target SWE role and job description.
Return strict JSON only with exactly these keys: overall_score, keyword_score, impact_score, clarity_score, technical_depth_score, experience_match_score, required_skills_match, preferred_skills_match, missing_keywords, strong_keywords, weak_bullets, suggested_bullet_rewrites, strengths, risks, recommendations, recruiter_summary, summary.
required_skills_match and preferred_skills_match items must include skill, status strong|partial|missing, and evidence string or null.
weak_bullets must be objects with original, issue, suggestion. suggested_bullet_rewrites must be objects with original, rewrite, why_better, grounded_in_resume.
Focus on ATS-style keyword coverage, required and preferred skill coverage, technical-depth alignment, experience alignment, project relevance, education alignment, bullet impact, clarity, recruiter readability, and screening risks.
Never invent technologies, metrics, responsibilities, or achievements. Rewrites must use only facts present in the resume. If a metric is missing, recommend adding one rather than fabricating one. Distinguish missing keywords from genuinely missing experience. Scores are heuristic guidance, not ATS guarantees."""


JSON_REPAIR_SYSTEM_PROMPT = """Repair the user's resume analysis into strict JSON only.
Use the exact OfferOS schema. Convert weak bullet strings into objects with original, issue, suggestion. Convert rationale fields into why_better. Omit all markdown."""


def provider_from_settings(settings: Settings) -> AIProvider:
    provider = settings.ai_provider.lower().strip()
    if provider == "openrouter" and settings.openrouter_api_key:
        return OpenRouterProvider(settings.openrouter_api_key, settings.ai_model, settings.ai_timeout_seconds)
    if settings.ai_mock_enabled and settings.app_env in {"local", "test"}:
        return MockResumeAnalysisProvider()
    if provider in {"", "disabled"}:
        message = "AI Resume Analysis is not configured. Set AI_PROVIDER=openrouter, OPENROUTER_API_KEY, and AI_MODEL on the backend."
    elif provider == "openrouter":
        message = "AI Resume Analysis is not configured. Set OPENROUTER_API_KEY on the backend."
    else:
        message = f"AI provider '{settings.ai_provider}' is not supported. Use AI_PROVIDER=openrouter."
    raise AppError("ai_not_configured", message, 503)


def ai_status(settings: Settings) -> dict[str, object]:
    provider = settings.ai_provider.lower().strip()
    configured = provider == "openrouter" and bool(settings.openrouter_api_key)
    mock_available = settings.ai_mock_enabled and settings.app_env in {"local", "test"}
    return {
        "provider": provider or "disabled",
        "model": settings.ai_model,
        "configured": configured,
        "mock_enabled": settings.ai_mock_enabled,
        "available": configured or mock_available,
    }


def parse_analysis_result(content: str) -> ResumeAnalysisResult:
    try:
        raw = json.loads(strip_json_fences(content))
        normalized = normalize_analysis_payload(raw)
        return ResumeAnalysisResult.model_validate(normalized)
    except (json.JSONDecodeError, PydanticValidationError, TypeError, ValueError) as exc:
        raise AppError("ai_malformed_response", "AI returned an invalid resume analysis shape.", 502) from exc


def normalize_analysis_payload(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError("analysis payload must be an object")
    payload = dict(value)
    payload["weak_bullets"] = normalize_weak_bullets(payload.get("weak_bullets"))
    payload["suggested_bullet_rewrites"] = normalize_rewrites(payload.get("suggested_bullet_rewrites"))
    payload["required_skills_match"] = normalize_skill_matches(payload.get("required_skills_match"))
    payload["preferred_skills_match"] = normalize_skill_matches(payload.get("preferred_skills_match"))
    for key in ["missing_keywords", "strong_keywords", "strengths", "risks", "recommendations"]:
        payload[key] = normalize_string_list(payload.get(key))
    payload["recruiter_summary"] = str(payload.get("recruiter_summary") or payload.get("summary") or "")
    payload["summary"] = str(payload.get("summary") or "")
    return payload


def normalize_weak_bullets(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in value:
        if isinstance(item, str):
            normalized.append({
                "original": item,
                "issue": "This bullet needs clearer technical scope or impact.",
                "suggestion": "Add technologies, ownership, and measurable outcome.",
            })
        elif isinstance(item, dict):
            normalized.append({
                "original": str(item.get("original") or ""),
                "issue": str(item.get("issue") or ""),
                "suggestion": str(item.get("suggestion") or ""),
            })
    return normalized


def normalize_rewrites(value: object) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        normalized.append({
            "original": str(item.get("original") or ""),
            "rewrite": str(item.get("rewrite") or ""),
            "why_better": str(item.get("why_better") or item.get("rationale") or ""),
            "grounded_in_resume": bool(item.get("grounded_in_resume", True)),
        })
    return normalized


def normalize_skill_matches(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, object]] = []
    for item in value:
        if isinstance(item, str):
            normalized.append({"skill": item, "status": "missing", "evidence": None})
        elif isinstance(item, dict):
            status = str(item.get("status") or "missing").lower()
            normalized.append({
                "skill": str(item.get("skill") or ""),
                "status": status if status in {"strong", "partial", "missing"} else "missing",
                "evidence": item.get("evidence") if isinstance(item.get("evidence"), str) else None,
            })
    return normalized


def normalize_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def extract_openrouter_content(payload: dict[str, object]) -> str:
    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return message["content"]
    raise AppError("ai_provider_error", "OpenRouter returned an unreadable resume analysis.", 502)


def strip_json_fences(value: str) -> str:
    text = value.strip()
    fence_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    return fence_match.group(1).strip() if fence_match else text
