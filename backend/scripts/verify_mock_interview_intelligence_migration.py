"""Verify the PostgreSQL 0018 -> 0019 Mock Interview migration."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime

from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings
from scripts.migration_verification import (
    configure_sqlite_foreign_keys,
    database_uuid,
    json_value,
    log_database_target,
    require_fixture,
    require_revision,
    safe_count,
)


SOURCE_REVISION = "20260730_0018"
TARGET_REVISION = "20260803_0019"
SEED_USER_ID = "00000000-0000-0000-0000-000000001901"
SEED_CLERK_USER_ID = "migration-verification-mock-0019"
SEED_EMAIL = "migration-mock-0019@example.invalid"
SEED_SESSION_ID = "00000000-0000-0000-0000-000000001902"
SEED_SESSION_TITLE = "pre-0019-mock-interview"
SEED_COMMAND = (
    "python -m scripts.verify_mock_interview_intelligence_migration --seed"
)
EXPECTED_COLUMNS = {
    "career_context_version",
    "career_context_json",
    "question_plan_json",
    "trend_delta_json",
    "observation_summary_json",
    "intelligence_status",
}


def _engine():
    engine = create_engine(get_settings().database_url)
    configure_sqlite_foreign_keys(engine)
    return engine


def seed() -> None:
    engine = _engine()
    user_id = database_uuid(engine, SEED_USER_ID)
    session_id = database_uuid(engine, SEED_SESSION_ID)
    log_database_target(engine, phase="seed-pre-0019", target_revision=TARGET_REVISION)
    with engine.begin() as connection:
        require_revision(
            connection,
            SOURCE_REVISION,
            phase="seed-pre-0019",
            migration=TARGET_REVISION,
        )
        connection.execute(
            text("DELETE FROM users WHERE id = :id OR clerk_user_id = :clerk_id"),
            {"id": user_id, "clerk_id": SEED_CLERK_USER_ID},
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, clerk_user_id, email, name)
                VALUES (:id, :clerk_id, :email, :name)
                """
            ),
            {
                "id": user_id,
                "clerk_id": SEED_CLERK_USER_ID,
                "email": SEED_EMAIL,
                "name": "Mock 0019 migration verification",
            },
        )
        json_expression = (
            "CAST(:context_sources AS JSON)"
            if engine.dialect.name == "postgresql"
            else ":context_sources"
        )
        connection.execute(
            text(
                f"""
                INSERT INTO mock_interview_sessions (
                    id, user_id, interview_type, status, difficulty, title,
                    target_role, company_name, question_count,
                    current_question_index, current_follow_up_count,
                    context_sources, started_at, provider, model,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, 'technical', 'completed', 'standard', :title,
                    'Software Engineer', '', 3, 3, 0, {json_expression},
                    :now, 'mock', 'migration-verification', :now, :now
                )
                """
            ),
            {
                "id": session_id,
                "user_id": user_id,
                "title": SEED_SESSION_TITLE,
                "context_sources": json.dumps([]),
                "now": datetime.now(UTC),
            },
        )
    confirm_seed(engine)
    engine.dispose()


def confirm_seed(engine=None) -> None:
    owns_engine = engine is None
    engine = engine or _engine()
    user_fixture_id = database_uuid(engine, SEED_USER_ID)
    session_fixture_id = database_uuid(engine, SEED_SESSION_ID)
    with engine.connect() as connection:
        require_revision(
            connection,
            SOURCE_REVISION,
            phase="confirm-seed-pre-0019",
            migration=TARGET_REVISION,
        )
        session_id = connection.scalar(
            text(
                """
                SELECT id FROM mock_interview_sessions
                WHERE id = :id AND user_id = :user_id AND title = :title
                """
            ),
            {
                "id": session_fixture_id,
                "user_id": user_fixture_id,
                "title": SEED_SESSION_TITLE,
            },
        )
        require_fixture(
            session_id,
            entity="MockInterviewSession",
            identifier=SEED_SESSION_ID,
            phase="confirm-seed-pre-0019",
            migration=TARGET_REVISION,
            seed_command=SEED_COMMAND,
        )
        print(
            "migration_verification seeded_entity=mock_interview_session "
            f"safe_identifier={SEED_SESSION_ID} "
            f"sessions_count={safe_count(connection, 'mock_interview_sessions')} "
            f"current_revision={SOURCE_REVISION}"
        )
    if owns_engine:
        engine.dispose()


def verify() -> None:
    engine = _engine()
    user_fixture_id = database_uuid(engine, SEED_USER_ID)
    session_fixture_id = database_uuid(engine, SEED_SESSION_ID)
    log_database_target(engine, phase="verify-0019", target_revision=TARGET_REVISION)
    with engine.connect() as connection:
        require_revision(
            connection,
            TARGET_REVISION,
            phase="verify-0019",
            migration=TARGET_REVISION,
        )
        inspector = inspect(connection)
        columns = {
            row["name"]
            for row in inspector.get_columns("mock_interview_sessions")
        }
        missing_columns = EXPECTED_COLUMNS - columns
        if missing_columns:
            raise RuntimeError(
                f"Mock Interview migration {TARGET_REVISION} is missing columns: "
                f"{sorted(missing_columns)}"
            )
        row = connection.execute(
            text(
                """
                SELECT career_context_version, career_context_json,
                       question_plan_json, trend_delta_json,
                       observation_summary_json, intelligence_status
                FROM mock_interview_sessions
                WHERE id = :id AND user_id = :user_id AND title = :title
                """
            ),
            {
                "id": session_fixture_id,
                "user_id": user_fixture_id,
                "title": SEED_SESSION_TITLE,
            },
        ).mappings().one_or_none()
        row = require_fixture(
            row,
            entity="MockInterviewSession",
            identifier=SEED_SESSION_ID,
            phase="verify-legacy-session-0019",
            migration=TARGET_REVISION,
            seed_command=SEED_COMMAND,
        )
        expected = {
            "career_context_version": "",
            "career_context_json": {},
            "question_plan_json": {},
            "trend_delta_json": {},
            "observation_summary_json": [],
            "intelligence_status": "unavailable",
        }
        actual = {
            key: json_value(value)
            if key.endswith("_json")
            else value
            for key, value in row.items()
        }
        if actual != expected:
            raise RuntimeError(
                f"Mock Interview migration {TARGET_REVISION} produced unexpected legacy defaults."
            )
        print(
            "migration_verification verified_entity=mock_interview_session "
            f"safe_identifier={SEED_SESSION_ID} "
            f"sessions_count={safe_count(connection, 'mock_interview_sessions')} "
            f"current_revision={TARGET_REVISION}"
        )
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--seed", action="store_true")
    mode.add_argument("--confirm-seed", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.seed:
        seed()
    elif args.confirm_seed:
        confirm_seed()
    else:
        verify()
