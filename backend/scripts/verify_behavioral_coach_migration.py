"""Verify the PostgreSQL 0020 -> 0021 Behavioral Coach migration."""
from __future__ import annotations

import argparse
from datetime import UTC, datetime

from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings
from scripts.migration_verification import configure_sqlite_foreign_keys, database_uuid, json_value, log_database_target, require_fixture, require_revision, safe_count

SOURCE_REVISION = "20260804_0020"
TARGET_REVISION = "20260805_0021"
SEED_USER_ID = "00000000-0000-0000-0000-000000002101"
SEED_STORY_ID = "00000000-0000-0000-0000-000000002102"
SEED_CLERK_USER_ID = "migration-verification-behavioral-0021"
SEED_COMMAND = "python -m scripts.verify_behavioral_coach_migration --seed"


def _engine():
    engine = create_engine(get_settings().database_url); configure_sqlite_foreign_keys(engine); return engine


def seed() -> None:
    engine = _engine(); user_id = database_uuid(engine, SEED_USER_ID); story_id = database_uuid(engine, SEED_STORY_ID); now = datetime.now(UTC)
    log_database_target(engine, phase="seed-pre-0021", target_revision=TARGET_REVISION)
    with engine.begin() as connection:
        require_revision(connection, SOURCE_REVISION, phase="seed-pre-0021", migration=TARGET_REVISION)
        connection.execute(text("DELETE FROM users WHERE id = :id OR clerk_user_id = :clerk"), {"id": user_id, "clerk": SEED_CLERK_USER_ID})
        connection.execute(text("INSERT INTO users (id, clerk_user_id, email, name) VALUES (:id, :clerk, :email, :name)"), {"id": user_id, "clerk": SEED_CLERK_USER_ID, "email": "behavioral-0021@example.invalid", "name": "Behavioral 0021 verification"})
        connection.execute(text("INSERT INTO behavioral_questions (id, user_id, question, category, star_situation, star_task, star_action, star_result, confidence_score, status, created_at, updated_at) VALUES (:id, :user_id, 'Tell me about ownership.', 'Ownership', 'A release was blocked.', 'Restore delivery.', 'I isolated the issue and coordinated the fix.', 'The release shipped.', 3, 'in_progress', :now, :now)"), {"id": story_id, "user_id": user_id, "now": now})
    confirm_seed(engine); engine.dispose()


def confirm_seed(engine=None) -> None:
    owns = engine is None; engine = engine or _engine(); story_id = database_uuid(engine, SEED_STORY_ID)
    with engine.connect() as connection:
        require_revision(connection, SOURCE_REVISION, phase="confirm-seed-pre-0021", migration=TARGET_REVISION)
        found = connection.scalar(text("SELECT id FROM behavioral_questions WHERE id = :id"), {"id": story_id})
        require_fixture(found, entity="BehavioralQuestion", identifier=SEED_STORY_ID, phase="confirm-seed-pre-0021", migration=TARGET_REVISION, seed_command=SEED_COMMAND)
        print(f"migration_verification seeded_entity=behavioral_question safe_identifier={SEED_STORY_ID} stories_count={safe_count(connection, 'behavioral_questions')} current_revision={SOURCE_REVISION}")
    if owns: engine.dispose()


def verify() -> None:
    engine = _engine(); story_id = database_uuid(engine, SEED_STORY_ID); log_database_target(engine, phase="verify-0021", target_revision=TARGET_REVISION)
    with engine.connect() as connection:
        require_revision(connection, TARGET_REVISION, phase="verify-0021", migration=TARGET_REVISION)
        columns = {row["name"] for row in inspect(connection).get_columns("behavioral_questions")}
        required = {"competency_tags", "star_completeness_json", "latest_evaluation_json", "readiness_status", "career_context_version"}
        if missing := required - columns: raise RuntimeError(f"Behavioral Coach migration {TARGET_REVISION} is missing {sorted(missing)}")
        row = connection.execute(text("SELECT competency_tags, star_completeness_json, readiness_status FROM behavioral_questions WHERE id = :id"), {"id": story_id}).mappings().one_or_none()
        row = require_fixture(row, entity="BehavioralQuestion", identifier=SEED_STORY_ID, phase="verify-legacy-story-0021", migration=TARGET_REVISION, seed_command=SEED_COMMAND)
        if json_value(row["competency_tags"]) != [] or json_value(row["star_completeness_json"]) != {} or row["readiness_status"] != "draft": raise RuntimeError("Behavioral Coach legacy defaults are not safe.")
        tables = set(inspect(connection).get_table_names())
        if not {"behavioral_story_evaluations", "behavioral_practice_sessions"}.issubset(tables): raise RuntimeError("Behavioral Coach tables are missing.")
        print(f"migration_verification verified_entity=behavioral_question safe_identifier={SEED_STORY_ID} stories_count={safe_count(connection, 'behavioral_questions')} current_revision={TARGET_REVISION}")
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(); mode = parser.add_mutually_exclusive_group(required=True); mode.add_argument("--seed", action="store_true"); mode.add_argument("--confirm-seed", action="store_true"); mode.add_argument("--verify", action="store_true"); args = parser.parse_args()
    seed() if args.seed else confirm_seed() if args.confirm_seed else verify()
