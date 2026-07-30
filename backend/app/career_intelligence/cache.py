from __future__ import annotations

from datetime import UTC, datetime, timedelta
from threading import RLock
from typing import Any
from uuid import UUID

from sqlalchemy import event
from sqlalchemy.orm import Session


CACHE_VERSION = "career-context-v1"
CACHE_TTL = timedelta(seconds=45)
_cache: dict[str, tuple[datetime, Any]] = {}
_lock = RLock()


def cache_key(user_id: UUID) -> str:
    return f"{CACHE_VERSION}:{user_id}"


def get_cached(user_id: UUID) -> Any | None:
    key = cache_key(user_id)
    with _lock:
        value = _cache.get(key)
        if value is None:
            return None
        expires_at, context = value
        if expires_at <= datetime.now(UTC):
            _cache.pop(key, None)
            return None
        return context


def set_cached(user_id: UUID, context: Any) -> None:
    with _lock:
        _cache[cache_key(user_id)] = (datetime.now(UTC) + CACHE_TTL, context)


def invalidate(user_id: UUID) -> None:
    with _lock:
        _cache.pop(cache_key(user_id), None)


def clear_cache() -> None:
    with _lock:
        _cache.clear()


@event.listens_for(Session, "after_flush")
def _collect_changed_users(session: Session, _context: object) -> None:
    changed = session.info.setdefault("career_intelligence_changed_users", set())
    for row in (*session.new, *session.dirty, *session.deleted):
        user_id = getattr(row, "user_id", None)
        if isinstance(user_id, UUID):
            changed.add(user_id)


@event.listens_for(Session, "after_commit")
def _invalidate_changed_users(session: Session) -> None:
    for user_id in session.info.pop("career_intelligence_changed_users", set()):
        invalidate(user_id)


@event.listens_for(Session, "after_rollback")
def _discard_changed_users(session: Session) -> None:
    session.info.pop("career_intelligence_changed_users", None)
