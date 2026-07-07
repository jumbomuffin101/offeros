from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.resume_analysis import BulletRewrite, ResumeAnalysisResult


ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "keyword_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "impact_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "clarity_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "technical_depth_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "missing_keywords": {"type": "array", "items": {"type": "string"}},
        "strong_keywords": {"type": "array", "items": {"type": "string"}},
        "weak_bullets": {"type": "array", "items": {"type": "string"}},
        "suggested_bullet_rewrites": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "original": {"type": "string"},
                    "rewrite": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["original", "rewrite", "rationale"],
            },
        },
        "strengths": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
    },
    "required": [
        "overall_score",
        "keyword_score",
        "impact_score",
        "clarity_score",
        "technical_depth_score",
        "missing_keywords",
        "strong_keywords",
        "weak_bullets",
        "suggested_bullet_rewrites",
        "strengths",
        "risks",
        "recommendations",
        "summary",
    ],
}


class ResumeAIProvider:
    provider = "mock"
    model = "local-mock"

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        raise NotImplementedError


class MockResumeAIProvider(ResumeAIProvider):
    provider = "mock"
    model = "local-mock"

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        lower_resume = resume_text.lower()
        lower_context = f"{target_role} {job_description}".lower()
        keywords = [
            "typescript", "react", "python", "fastapi", "postgresql", "sql", "aws", "docker",
            "testing", "distributed systems", "api", "backend", "frontend", "observability",
        ]
        desired = [keyword for keyword in keywords if keyword in lower_context] or ["api", "testing", "system design"]
        strong = [keyword for keyword in keywords if keyword in lower_resume][:8]
        missing = [keyword for keyword in desired if keyword not in lower_resume][:8]
        has_metrics = any(character.isdigit() for character in resume_text)
        score_base = 74 + min(len(strong) * 2, 12) - len(missing) * 3
        if has_metrics:
            score_base += 6
        overall = clamp(score_base)
        weak_bullets = [line.strip("-• ").strip() for line in resume_text.splitlines() if line.strip().startswith(("-", "•")) and not any(char.isdigit() for char in line)][:3]
        return ResumeAnalysisResult(
            overall_score=overall,
            keyword_score=clamp(72 + len(strong) * 3 - len(missing) * 4),
            impact_score=86 if has_metrics else 62,
            clarity_score=78 if len(resume_text) < 8000 else 68,
            technical_depth_score=clamp(70 + len([item for item in strong if item in {"fastapi", "postgresql", "docker", "distributed systems", "aws"}]) * 5),
            missing_keywords=missing,
            strong_keywords=strong or ["software engineering", "projects"],
            weak_bullets=weak_bullets,
            suggested_bullet_rewrites=[
                BulletRewrite(
                    original=bullet,
                    rewrite=f"Rewrite with scope, technical ownership, and a quantified outcome: {bullet}",
                    rationale="SWE recruiters scan for ownership, concrete technologies, and measurable impact.",
                )
                for bullet in weak_bullets[:3]
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
            summary="Local mock analysis generated because production AI is not configured. Use it for UX testing, not final resume decisions.",
        )


class OpenAIResumeAIProvider(ResumeAIProvider):
    provider = "openai"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def analyze(self, *, resume_text: str, target_role: str, job_description: str) -> ResumeAnalysisResult:
        payload = {
            "model": self.model,
            "input": [
                {"role": "system", "content": RESUME_ANALYSIS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "target_role": target_role,
                            "job_description": job_description,
                            "resume_text": resume_text,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "resume_analysis",
                    "schema": ANALYSIS_SCHEMA,
                    "strict": True,
                }
            },
        }
        request = Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=45) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise AppError("ai_provider_error", "OpenAI could not complete the resume analysis.", 502, detail) from exc
        except (TimeoutError, URLError, OSError) as exc:
            raise AppError("ai_provider_unavailable", "OpenAI is unavailable. Try again in a moment.", 503) from exc
        return ResumeAnalysisResult.model_validate(extract_response_json(response_payload))


RESUME_ANALYSIS_SYSTEM_PROMPT = """You are OfferOS Resume Intelligence, a precise technical recruiting assistant for software engineering students.
Evaluate the resume against the target SWE role and optional job description.
Return strict JSON only. Be specific, honest, and useful. Focus on role fit, ATS-style keyword coverage, bullet strength, quantified impact, technical depth, clarity, recruiter readability, risks, and concrete rewrites.
Do not invent experience. Recommend adding keywords only when the candidate can truthfully support them."""


def provider_from_settings(settings: Settings) -> ResumeAIProvider:
    provider = settings.ai_provider.lower().strip()
    if provider == "openai" and settings.openai_api_key:
        return OpenAIResumeAIProvider(settings.openai_api_key, settings.ai_model)
    if settings.app_env in {"local", "test"}:
        return MockResumeAIProvider()
    raise AppError(
        "ai_not_configured",
        "AI Resume Analysis is not configured. Set AI_PROVIDER=openai, OPENAI_API_KEY, and AI_MODEL on the backend.",
        503,
    )


def extract_response_json(payload: dict[str, object]) -> object:
    if isinstance(payload.get("output_text"), str):
        return json.loads(payload["output_text"])
    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and isinstance(content.get("text"), str):
                return json.loads(content["text"])
    raise AppError("ai_provider_error", "OpenAI returned an unreadable resume analysis.", 502)


def clamp(value: int) -> int:
    return max(0, min(100, value))
