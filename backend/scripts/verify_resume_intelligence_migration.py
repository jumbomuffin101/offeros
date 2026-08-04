"""Verify the PostgreSQL 0019 -> 0020 Resume Intelligence migration."""

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


SOURCE_REVISION = "20260803_0019"
TARGET_REVISION = "20260804_0020"
SEED_USER_ID = "00000000-0000-0000-0000-000000002001"
SEED_RESUME_ID = "00000000-0000-0000-0000-000000002002"
SEED_ANALYSIS_ID = "00000000-0000-0000-0000-000000002003"
SEED_CLERK_USER_ID = "migration-verification-resume-0020"
SEED_COMMAND = "python -m scripts.verify_resume_intelligence_migration --seed"


def _engine():
    engine = create_engine(get_settings().database_url)
    configure_sqlite_foreign_keys(engine)
    return engine


def seed() -> None:
    engine = _engine()
    user_id = database_uuid(engine, SEED_USER_ID)
    resume_id = database_uuid(engine, SEED_RESUME_ID)
    analysis_id = database_uuid(engine, SEED_ANALYSIS_ID)
    log_database_target(engine, phase="seed-pre-0020", target_revision=TARGET_REVISION)
    now = datetime.now(UTC)
    empty_json = json.dumps([])
    json_expression = "CAST(:empty_json AS JSON)" if engine.dialect.name == "postgresql" else ":empty_json"
    with engine.begin() as connection:
        require_revision(connection, SOURCE_REVISION, phase="seed-pre-0020", migration=TARGET_REVISION)
        connection.execute(
            text("DELETE FROM users WHERE id = :id OR clerk_user_id = :clerk_id"),
            {"id": user_id, "clerk_id": SEED_CLERK_USER_ID},
        )
        connection.execute(
            text("INSERT INTO users (id, clerk_user_id, email, name) VALUES (:id, :clerk_id, :email, :name)"),
            {"id": user_id, "clerk_id": SEED_CLERK_USER_ID, "email": "migration-resume-0020@example.invalid", "name": "Resume 0020 migration verification"},
        )
        connection.execute(
            text(
                f"""
                INSERT INTO resume_versions (
                    id, user_id, name, target_role, description, status,
                    keyword_match_score, tags, strengths, weaknesses,
                    missing_keywords, suggested_improvement, notes, file_name,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, 'Legacy Resume', 'Backend Engineer', '', 'draft',
                    0, {json_expression}, {json_expression}, {json_expression},
                    {json_expression}, '', '', '', :now, :now
                )
                """
            ),
            {"id": resume_id, "user_id": user_id, "empty_json": empty_json, "now": now},
        )
        connection.execute(
            text(
                f"""
                INSERT INTO resume_analyses (
                    id, user_id, resume_version_id, target_role, overall_score,
                    keyword_score, impact_score, clarity_score, technical_depth_score,
                    missing_keywords, strong_keywords, weak_bullets,
                    suggested_bullet_rewrites, strengths, risks, recommendations,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, :resume_id, 'Backend Engineer', 72,
                    70, 68, 80, 74,
                    {json_expression}, {json_expression}, {json_expression},
                    {json_expression}, {json_expression}, {json_expression}, {json_expression},
                    :now, :now
                )
                """
            ),
            {"id": analysis_id, "user_id": user_id, "resume_id": resume_id, "empty_json": empty_json, "now": now},
        )
    confirm_seed(engine)
    engine.dispose()


def confirm_seed(engine=None) -> None:
    owns_engine = engine is None
    engine = engine or _engine()
    analysis_id = database_uuid(engine, SEED_ANALYSIS_ID)
    with engine.connect() as connection:
        require_revision(connection, SOURCE_REVISION, phase="confirm-seed-pre-0020", migration=TARGET_REVISION)
        found = connection.scalar(text("SELECT id FROM resume_analyses WHERE id = :id"), {"id": analysis_id})
        require_fixture(found, entity="ResumeAnalysis", identifier=SEED_ANALYSIS_ID, phase="confirm-seed-pre-0020", migration=TARGET_REVISION, seed_command=SEED_COMMAND)
        print(f"migration_verification seeded_entity=resume_analysis safe_identifier={SEED_ANALYSIS_ID} analyses_count={safe_count(connection, 'resume_analyses')} current_revision={SOURCE_REVISION}")
    if owns_engine:
        engine.dispose()


def verify() -> None:
    engine = _engine()
    analysis_id = database_uuid(engine, SEED_ANALYSIS_ID)
    log_database_target(engine, phase="verify-0020", target_revision=TARGET_REVISION)
    with engine.connect() as connection:
        require_revision(connection, TARGET_REVISION, phase="verify-0020", migration=TARGET_REVISION)
        columns = {row["name"] for row in inspect(connection).get_columns("resume_analyses")}
        if "intelligence_json" not in columns:
            raise RuntimeError(f"Resume Intelligence migration {TARGET_REVISION} is missing intelligence_json.")
        value = connection.scalar(text("SELECT intelligence_json FROM resume_analyses WHERE id = :id"), {"id": analysis_id})
        value = require_fixture(value, entity="ResumeAnalysis", identifier=SEED_ANALYSIS_ID, phase="verify-legacy-analysis-0020", migration=TARGET_REVISION, seed_command=SEED_COMMAND)
        if json_value(value) != {}:
            raise RuntimeError(f"Resume Intelligence migration {TARGET_REVISION} did not apply a safe empty legacy default.")
        print(f"migration_verification verified_entity=resume_analysis safe_identifier={SEED_ANALYSIS_ID} analyses_count={safe_count(connection, 'resume_analyses')} current_revision={TARGET_REVISION}")
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
