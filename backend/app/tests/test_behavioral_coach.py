import json
from types import SimpleNamespace

from app.models.prep import BehavioralQuestion
import app.services.behavioral_intelligence as behavioral_module
from app.services.behavioral_intelligence import (
    BEHAVIORAL_SYSTEM_PROMPT,
    COMPETENCIES,
    compare_evaluations,
    deterministic_answer_evaluation,
    deterministic_star_check,
    normalize_competencies,
    BehavioralCareerContextBuilder,
    BehavioralCoachService,
    BEHAVIORAL_RESULT_SHAPE,
)


def story(**overrides) -> BehavioralQuestion:
    values = {
        "question": "Tell me about a time you showed ownership.", "category": "Ownership",
        "star_situation": "A production release was blocked late in the sprint.",
        "star_task": "I needed to identify the failure and restore a safe release path.",
        "star_action": "I traced the failing request, isolated the database timeout, coordinated a rollback, and documented the tradeoff for the team.",
        "star_result": "The release shipped the next day and request failures fell by 35 percent. I learned to add the check earlier next time.",
        "confidence_score": 4, "competency_tags": ["ownership", "impact"],
    }
    values.update(overrides)
    return BehavioralQuestion(**values)


def test_star_completeness_detects_complete_and_missing_result() -> None:
    complete = deterministic_star_check(story())
    missing = deterministic_star_check(story(star_result=""))
    assert complete["score"] > missing["score"]
    assert "missing_result" not in complete["signals"]
    assert "missing_result" in missing["signals"]


def test_star_completeness_detects_ownership_quantification_reflection_and_context() -> None:
    result = deterministic_star_check(story(
        star_situation="Context " * 150,
        star_task="The team needed to address it.",
        star_action="The team worked on it.",
        star_result="It was better.",
        competency_tags=["failure"],
    ))
    assert {"weak_action", "unclear_ownership", "no_quantification", "insufficient_reflection", "too_much_context", "no_failure_learning"}.issubset(set(result["signals"]))


def test_competency_normalization_is_controlled_and_supports_multiple_tags() -> None:
    assert normalize_competencies(["Ownership", "customer focus", "TEAMWORK", "unknown"]) == ["ownership", "customer_focus", "collaboration"]
    assert len(COMPETENCIES) == 16


def test_deterministic_evaluation_never_fabricates_metrics() -> None:
    result = deterministic_answer_evaluation("I investigated the incident and learned to document the decision.", ["ownership"])
    assert "The result lacks quantified impact where relevant." in result.weaknesses
    assert all("do not invent" in item.lower() or "metric" not in item.lower() for item in result.recommended_revision)
    assert "untrusted data" in BEHAVIORAL_SYSTEM_PROMPT
    assert "Never fabricate" in BEHAVIORAL_SYSTEM_PROMPT


def test_malformed_ai_json_is_repaired_once(monkeypatch) -> None:
    class Provider:
        provider = "openrouter"; model = "test-model"
        calls = 0
        def structured(self, _messages, *, max_tokens):
            self.calls += 1
            return "not-json" if self.calls == 1 else json.dumps(BEHAVIORAL_RESULT_SHAPE)
    provider = Provider()
    monkeypatch.setattr(behavioral_module, "get_settings", lambda: SimpleNamespace(ai_provider="openrouter", openrouter_api_key="configured"))
    monkeypatch.setattr(behavioral_module, "provider_from_settings", lambda _settings: provider)
    result, name, model = BehavioralCoachService(None)._evaluation(story(), deterministic_star_check(story()), {}, ["ownership"])
    assert provider.calls == 2
    assert result.competencies == ["ownership"]
    assert (name, model) == ("openrouter", "test-model")


def test_comparison_requires_same_story_schema_and_marks_different_focus_partial() -> None:
    current = deterministic_answer_evaluation("I owned the incident response, reduced failures by 20 percent, and learned to add a preflight check.", ["ownership"])
    exact = SimpleNamespace(id="prior", schema_version="behavioral-evaluation-v1", competency_focus="ownership", evaluation_json={"quality_scores": current.quality_scores.model_dump()})
    incompatible = SimpleNamespace(id="old", schema_version="legacy-v0", competency_focus="ownership", evaluation_json={"quality_scores": {}})
    assert compare_evaluations(exact, current, "ownership")["status"] == "comparable"
    assert compare_evaluations(exact, current, "impact")["status"] == "partially_comparable"
    assert compare_evaluations(incompatible, current, "ownership")["status"] == "not_comparable"


def test_behavioral_api_evaluates_compares_practices_and_aggregates(client) -> None:
    created = client.post("/api/v1/prep/behavioral", json={
        "question": "Tell me about ownership.", "category": "Ownership",
        "star_situation": "A production release was blocked.",
        "star_task": "I needed to restore delivery safely.",
        "star_action": "I isolated the timeout, proposed a rollback, coordinated the fix, and documented the tradeoff.",
        "star_result": "The release shipped and failures fell by 35 percent. I learned to add the check earlier.",
        "confidence_score": 4, "status": "in_progress", "competency_tags": ["Ownership", "impact"],
    })
    assert created.status_code == 201
    story_id = created.json()["data"]["id"]
    assert created.json()["data"]["competency_tags"] == ["ownership", "impact"]

    first = client.post(f"/api/v1/prep/behavioral/{story_id}/evaluate", json={"competency_focus": "ownership"})
    assert first.status_code == 200
    assert first.json()["data"]["story"]["latest_evaluated_at"]
    assert first.json()["data"]["evaluation"]["provider"] == "deterministic"
    assert first.json()["data"]["evaluation"]["comparison_json"]["status"] == "not_comparable"

    second = client.post(f"/api/v1/prep/behavioral/{story_id}/evaluate", json={"competency_focus": "ownership"})
    assert second.status_code == 200
    assert second.json()["data"]["evaluation"]["comparison_json"]["status"] == "comparable"

    practice = client.post("/api/v1/prep/behavioral-practice", json={
        "story_id": story_id, "competency": "ownership",
        "prompt": "Tell me about a time you showed ownership.",
        "answer": "I investigated the blocked release, coordinated the rollback, fixed the timeout, and learned to add an earlier safety check.",
    })
    assert practice.status_code == 201
    assert practice.json()["data"]["evaluation_json"]["quality_scores"]

    history = client.get(f"/api/v1/prep/behavioral/{story_id}/evaluations")
    assert history.status_code == 200
    assert len(history.json()["data"]) == 2
    portfolio = client.get("/api/v1/prep/behavioral-portfolio")
    assert portfolio.status_code == 200
    assert portfolio.json()["data"]["evaluated_stories"] == 1
    assert "ownership" in portfolio.json()["data"]["competencies_covered"]


def test_behavioral_api_rejects_unsupported_competency(client) -> None:
    response = client.post("/api/v1/prep/behavioral-practice", json={
        "competency": "company_secret_rubric", "prompt": "Tell me about a time you led.",
        "answer": "I led the team through a difficult project and documented what I learned from the result.",
    })
    assert response.status_code == 422


def test_career_intelligence_failure_does_not_block_story_crud_or_evaluation(client, monkeypatch) -> None:
    created = client.post("/api/v1/prep/behavioral", json={"question": "Tell me about collaboration.", "category": "Collaboration", "star_situation": "A teammate disagreed with the approach.", "star_task": "I needed to align the team.", "star_action": "I listened, compared tradeoffs, and proposed a shared test.", "star_result": "We agreed on the approach and I documented what I learned.", "confidence_score": 3, "competency_tags": ["collaboration"]})
    assert created.status_code == 201
    monkeypatch.setattr(BehavioralCareerContextBuilder, "build", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("context unavailable")))
    story_id = created.json()["data"]["id"]
    evaluated = client.post(f"/api/v1/prep/behavioral/{story_id}/evaluate", json={"competency_focus": "collaboration"})
    assert evaluated.status_code == 200
    assert evaluated.json()["data"]["evaluation"]["status"] == "completed"
