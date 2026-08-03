"""Verify the PostgreSQL 0017 -> 0018 Career Intelligence migration."""

from __future__ import annotations

import argparse
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


SOURCE_REVISION = "20260727_0017"
TARGET_REVISION = "20260730_0018"
SEED_USER_ID = "00000000-0000-0000-0000-000000001801"
SEED_CLERK_USER_ID = "migration-verification-career-0018"
SEED_EMAIL = "migration-career-0018@example.invalid"
SEED_OBSERVATION_ID = "00000000-0000-0000-0000-000000001802"
SEED_OBSERVATION_KEY = "migration-verification-0018"
SEED_COMMAND = (
    "python -m scripts.verify_career_intelligence_migration --seed"
)
EXPECTED_INDEXES = {
    "ix_career_observations_user_id",
    "ix_career_observations_user_status",
    "ix_career_observations_user_type_confirmed",
    "uq_career_observations_user_key",
}


def _engine():
    engine = create_engine(get_settings().database_url)
    configure_sqlite_foreign_keys(engine)
    return engine


def seed() -> None:
    engine = _engine()
    user_id = database_uuid(engine, SEED_USER_ID)
    log_database_target(engine, phase="seed-pre-0018", target_revision=TARGET_REVISION)
    with engine.begin() as connection:
        require_revision(
            connection,
            SOURCE_REVISION,
            phase="seed-pre-0018",
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
                "name": "Career 0018 migration verification",
            },
        )
    confirm_seed(engine)
    engine.dispose()


def confirm_seed(engine=None) -> None:
    owns_engine = engine is None
    engine = engine or _engine()
    user_fixture_id = database_uuid(engine, SEED_USER_ID)
    with engine.connect() as connection:
        require_revision(
            connection,
            SOURCE_REVISION,
            phase="confirm-seed-pre-0018",
            migration=TARGET_REVISION,
        )
        user_id = connection.scalar(
            text(
                "SELECT id FROM users WHERE id = :id AND clerk_user_id = :clerk_id"
            ),
            {"id": user_fixture_id, "clerk_id": SEED_CLERK_USER_ID},
        )
        require_fixture(
            user_id,
            entity="User",
            identifier=SEED_CLERK_USER_ID,
            phase="confirm-seed-pre-0018",
            migration=TARGET_REVISION,
            seed_command=SEED_COMMAND,
        )
        print(
            "migration_verification seeded_entity=user "
            f"safe_identifier={SEED_CLERK_USER_ID} users_count={safe_count(connection, 'users')} "
            f"current_revision={SOURCE_REVISION}"
        )
    if owns_engine:
        engine.dispose()


def verify() -> None:
    engine = _engine()
    user_fixture_id = database_uuid(engine, SEED_USER_ID)
    observation_fixture_id = database_uuid(engine, SEED_OBSERVATION_ID)
    log_database_target(engine, phase="verify-0018", target_revision=TARGET_REVISION)
    with engine.begin() as connection:
        require_revision(
            connection,
            TARGET_REVISION,
            phase="verify-0018",
            migration=TARGET_REVISION,
        )
        user_id = connection.scalar(
            text(
                "SELECT id FROM users WHERE id = :id AND clerk_user_id = :clerk_id"
            ),
            {"id": user_fixture_id, "clerk_id": SEED_CLERK_USER_ID},
        )
        require_fixture(
            user_id,
            entity="User",
            identifier=SEED_CLERK_USER_ID,
            phase="verify-0018",
            migration=TARGET_REVISION,
            seed_command=SEED_COMMAND,
        )

        inspector = inspect(connection)
        if "career_observations" not in inspector.get_table_names():
            raise RuntimeError(
                f"Expected table career_observations during verify-0018 for {TARGET_REVISION}."
            )
        indexes = {
            row["name"] for row in inspector.get_indexes("career_observations")
        }
        missing_indexes = EXPECTED_INDEXES - indexes
        if missing_indexes:
            raise RuntimeError(
                f"Career Intelligence migration {TARGET_REVISION} is missing indexes: "
                f"{sorted(missing_indexes)}"
            )
        checks = {
            row["name"]
            for row in inspector.get_check_constraints("career_observations")
        }
        if "ck_career_observations_status" not in checks:
            raise RuntimeError(
                f"Career Intelligence migration {TARGET_REVISION} is missing status constraint."
            )
        foreign_keys = inspector.get_foreign_keys("career_observations")
        if not any(
            row["referred_table"] == "users"
            and row.get("options", {}).get("ondelete") == "CASCADE"
            for row in foreign_keys
        ):
            raise RuntimeError(
                f"Career Intelligence migration {TARGET_REVISION} is missing user cascade."
            )

        connection.execute(
            text("DELETE FROM career_observations WHERE id = :id"),
            {"id": observation_fixture_id},
        )
        now = datetime.now(UTC)
        connection.execute(
            text(
                """
                INSERT INTO career_observations (
                    id, user_id, dedupe_key, observation_type, title, summary,
                    confidence, source_type, first_observed_at, last_confirmed_at
                ) VALUES (
                    :id, :user_id, :dedupe_key, :observation_type, :title, :summary,
                    :confidence, :source_type, :first_observed_at, :last_confirmed_at
                )
                """
            ),
            {
                "id": observation_fixture_id,
                "user_id": user_fixture_id,
                "dedupe_key": SEED_OBSERVATION_KEY,
                "observation_type": "application_cadence",
                "title": "Migration verification",
                "summary": "Safe migration contract check.",
                "confidence": 0.9,
                "source_type": "verification",
                "first_observed_at": now,
                "last_confirmed_at": now,
            },
        )
        defaults = connection.execute(
            text(
                """
                SELECT status, source_ids_json, evidence_json
                FROM career_observations WHERE id = :id
                """
            ),
            {"id": observation_fixture_id},
        ).mappings().one_or_none()
        defaults = require_fixture(
            defaults,
            entity="CareerObservation",
            identifier=SEED_OBSERVATION_ID,
            phase="verify-defaults-0018",
            migration=TARGET_REVISION,
            seed_command=SEED_COMMAND,
        )
        if defaults["status"] != "active":
            raise RuntimeError("Career Observation status default is not active.")
        if json_value(defaults["source_ids_json"]) != []:
            raise RuntimeError("Career Observation source_ids_json default is not empty.")
        if json_value(defaults["evidence_json"]) != []:
            raise RuntimeError("Career Observation evidence_json default is not empty.")
        print(
            "migration_verification verified_entity=career_observation "
            f"safe_identifier={SEED_OBSERVATION_KEY} "
            f"observations_count={safe_count(connection, 'career_observations')} "
            f"current_revision={TARGET_REVISION}"
        )
        connection.execute(
            text("DELETE FROM users WHERE id = :id"), {"id": user_fixture_id}
        )
        remaining = connection.scalar(
            text("SELECT COUNT(*) FROM career_observations WHERE id = :id"),
            {"id": observation_fixture_id},
        )
        if remaining != 0:
            raise RuntimeError(
                f"Career Intelligence migration {TARGET_REVISION} user cascade failed."
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
