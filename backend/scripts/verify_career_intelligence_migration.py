"""Verify the PostgreSQL 0017 -> 0018 Career Intelligence migration contract."""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings


MARKER = "career-migration-verification"
EXPECTED_INDEXES = {
    "ix_career_observations_user_id",
    "ix_career_observations_user_status",
    "ix_career_observations_user_type_confirmed",
    "uq_career_observations_user_key",
}


def seed() -> None:
    engine = create_engine(get_settings().database_url)
    with engine.begin() as connection:
        connection.execute(
            text("DELETE FROM users WHERE clerk_user_id = :marker"),
            {"marker": MARKER},
        )
        connection.execute(
            text(
                """
                INSERT INTO users (id, clerk_user_id, email, name)
                VALUES (:id, :marker, :email, :name)
                """
            ),
            {
                "id": uuid4(),
                "marker": MARKER,
                "email": f"{MARKER}@example.com",
                "name": "Migration verification",
            },
        )
    engine.dispose()


def verify() -> None:
    engine = create_engine(get_settings().database_url)
    inspector = inspect(engine)
    assert "career_observations" in inspector.get_table_names()
    indexes = {row["name"] for row in inspector.get_indexes("career_observations")}
    assert EXPECTED_INDEXES <= indexes
    checks = {row["name"] for row in inspector.get_check_constraints("career_observations")}
    assert "ck_career_observations_status" in checks
    foreign_keys = inspector.get_foreign_keys("career_observations")
    assert any(
        row["referred_table"] == "users"
        and row.get("options", {}).get("ondelete") == "CASCADE"
        for row in foreign_keys
    )

    observation_id = uuid4()
    now = datetime.now(UTC)
    with engine.begin() as connection:
        user_id = connection.scalar(
            text("SELECT id FROM users WHERE clerk_user_id = :marker"),
            {"marker": MARKER},
        )
        assert user_id is not None, "The pre-0018 user did not survive the migration."
        connection.execute(
            text(
                """
                INSERT INTO career_observations (
                    id, user_id, dedupe_key, observation_type, title, summary,
                    confidence, source_type, first_observed_at, last_confirmed_at
                )
                VALUES (
                    :id, :user_id, :dedupe_key, :observation_type, :title, :summary,
                    :confidence, :source_type, :first_observed_at, :last_confirmed_at
                )
                """
            ),
            {
                "id": observation_id,
                "user_id": user_id,
                "dedupe_key": "migration-verification",
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
                FROM career_observations
                WHERE id = :id
                """
            ),
            {"id": observation_id},
        ).mappings().one()
        assert defaults["status"] == "active"
        assert defaults["source_ids_json"] == []
        assert defaults["evidence_json"] == []
        connection.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        remaining = connection.scalar(
            text("SELECT count(*) FROM career_observations WHERE id = :id"),
            {"id": observation_id},
        )
        assert remaining == 0, "User deletion did not cascade to observations."
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--seed", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    seed() if args.seed else verify()
