"""Verify the PostgreSQL 0018 -> 0019 mock interview migration contract."""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings


USER_MARKER = "career-migration-verification"
SESSION_TITLE = "pre-0019-mock-interview"
EXPECTED_COLUMNS = {
    "career_context_version",
    "career_context_json",
    "question_plan_json",
    "trend_delta_json",
    "observation_summary_json",
    "intelligence_status",
}


def seed() -> None:
    engine = create_engine(get_settings().database_url)
    now = datetime.now(UTC)
    with engine.begin() as connection:
        user_id = connection.scalar(
            text("SELECT id FROM users WHERE clerk_user_id = :marker"),
            {"marker": USER_MARKER},
        )
        assert user_id is not None, "The pre-0018 migration user is missing."
        connection.execute(
            text(
                """
                INSERT INTO mock_interview_sessions (
                    id, user_id, interview_type, status, difficulty, title,
                    target_role, company_name, question_count,
                    current_question_index, current_follow_up_count,
                    context_sources, started_at, provider, model,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, 'technical', 'completed', 'standard', :title,
                    'Software Engineer', '', 3, 3, 0, '[]'::jsonb,
                    :now, 'mock', 'migration-verification', :now, :now
                )
                """
            ),
            {
                "id": uuid4(),
                "user_id": user_id,
                "title": SESSION_TITLE,
                "now": now,
            },
        )
    engine.dispose()


def verify() -> None:
    engine = create_engine(get_settings().database_url)
    inspector = inspect(engine)
    columns = {
        row["name"] for row in inspector.get_columns("mock_interview_sessions")
    }
    assert EXPECTED_COLUMNS <= columns
    with engine.begin() as connection:
        row = connection.execute(
            text(
                """
                SELECT career_context_version, career_context_json,
                       question_plan_json, trend_delta_json,
                       observation_summary_json, intelligence_status
                FROM mock_interview_sessions
                WHERE title = :title
                """
            ),
            {"title": SESSION_TITLE},
        ).mappings().one()
        assert row["career_context_version"] == ""
        assert row["career_context_json"] == {}
        assert row["question_plan_json"] == {}
        assert row["trend_delta_json"] == {}
        assert row["observation_summary_json"] == []
        assert row["intelligence_status"] == "unavailable"
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--seed", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    seed() if args.seed else verify()
