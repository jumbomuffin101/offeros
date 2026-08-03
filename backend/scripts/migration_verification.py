"""Shared, credential-safe helpers for migration contract verification."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import Engine, event, text
from sqlalchemy.engine import Connection, make_url


def configure_sqlite_foreign_keys(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection: Any, _record: Any) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def log_database_target(engine: Engine, *, phase: str, target_revision: str) -> None:
    url = make_url(str(engine.url))
    print(
        "migration_verification "
        f"phase={phase} driver={url.drivername} "
        f"host={url.host or 'local'} port={url.port or 'default'} "
        f"database={url.database or 'unknown'} target_revision={target_revision}"
    )


def current_revision(connection: Connection) -> str:
    tables = connection.dialect.get_table_names(connection)
    if "alembic_version" not in tables:
        return "base"
    revisions = list(
        connection.scalars(text("SELECT version_num FROM alembic_version"))
    )
    if len(revisions) != 1:
        raise RuntimeError(
            "Migration verification expected exactly one current Alembic revision, "
            f"but found {len(revisions)}."
        )
    return str(revisions[0])


def require_revision(
    connection: Connection,
    expected: str,
    *,
    phase: str,
    migration: str,
) -> None:
    actual = current_revision(connection)
    if actual != expected:
        raise RuntimeError(
            f"Migration verification phase '{phase}' for {migration} expected "
            f"Alembic revision {expected}, but found {actual}. Recreate the disposable "
            "verification database and run the documented upgrade sequence."
        )


def require_fixture(
    value: Any,
    *,
    entity: str,
    identifier: str,
    phase: str,
    migration: str,
    seed_command: str,
) -> Any:
    if value is None:
        raise RuntimeError(
            f"{entity} migration verification fixture '{identifier}' was not found "
            f"during phase '{phase}' for revision {migration}. Confirm the seed step "
            f"completed, committed, and used the same DATABASE_URL. Reproduce with: "
            f"{seed_command}"
        )
    return value


def json_value(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


def database_uuid(engine: Engine, value: str) -> UUID | str:
    return UUID(value) if engine.dialect.name == "postgresql" else value


def safe_count(connection: Connection, table: str) -> int:
    allowed = {"users", "career_observations", "mock_interview_sessions"}
    if table not in allowed:
        raise ValueError(f"Unsupported migration diagnostic table: {table}")
    return int(connection.scalar(text(f"SELECT COUNT(*) FROM {table}")) or 0)
