from datetime import UTC, datetime, timedelta
from typing import Iterable

from app.career_intelligence.enums import TrendDirection
from app.career_intelligence.schemas import CareerTrend


def count_trend(rows: Iterable[object], now: datetime, attribute: str = "updated_at") -> CareerTrend:
    now = _utc(now)
    current_start = now - timedelta(days=14)
    previous_start = now - timedelta(days=28)
    timestamps = [_utc(value) for row in rows if (value := getattr(row, attribute, None)) is not None]
    current = sum(current_start <= value <= now for value in timestamps)
    previous = sum(previous_start <= value < current_start for value in timestamps)
    sample = current + previous
    if sample < 4:
        direction = TrendDirection.INSUFFICIENT_DATA
    elif current >= previous * 1.2 and current > previous:
        direction = TrendDirection.IMPROVING
    elif current <= previous * 0.8 and current < previous:
        direction = TrendDirection.DECLINING
    else:
        direction = TrendDirection.STABLE
    return CareerTrend(
        direction=direction.value,
        current_value=float(current),
        comparison_value=float(previous),
        sample_size=sample,
        confidence=min(1, sample / 12),
    )


def score_trend(rows: Iterable[object], now: datetime, attribute: str) -> CareerTrend:
    now = _utc(now)
    current_start = now - timedelta(days=14)
    previous_start = now - timedelta(days=28)
    current: list[float] = []
    previous: list[float] = []
    for row in rows:
        updated = getattr(row, "updated_at", None)
        value = getattr(row, attribute, None)
        if updated is None or value is None:
            continue
        updated = _utc(updated)
        if current_start <= updated <= now:
            current.append(float(value))
        elif previous_start <= updated < current_start:
            previous.append(float(value))
    sample = len(current) + len(previous)
    if len(current) < 2 or len(previous) < 2:
        direction = TrendDirection.INSUFFICIENT_DATA
    else:
        delta = sum(current) / len(current) - sum(previous) / len(previous)
        direction = TrendDirection.IMPROVING if delta >= 5 else TrendDirection.DECLINING if delta <= -5 else TrendDirection.STABLE
    return CareerTrend(
        direction=direction.value,
        current_value=round(sum(current) / len(current), 1) if current else None,
        comparison_value=round(sum(previous) / len(previous), 1) if previous else None,
        sample_size=sample,
        confidence=min(1, sample / 10),
    )


def status_ratio_trend(
    rows: Iterable[object],
    now: datetime,
    positive_statuses: set[str],
) -> CareerTrend:
    """Compare outcomes for applications created in adjacent 14-day cohorts."""
    now = _utc(now)
    current_start = now - timedelta(days=14)
    previous_start = now - timedelta(days=28)
    current: list[object] = []
    previous: list[object] = []
    for row in rows:
        created_at = getattr(row, "created_at", None)
        if created_at is None:
            continue
        created_at = _utc(created_at)
        if current_start <= created_at <= now:
            current.append(row)
        elif previous_start <= created_at < current_start:
            previous.append(row)

    def ratio(group: list[object]) -> float | None:
        if not group:
            return None
        positives = sum(
            getattr(getattr(row, "status", None), "value", getattr(row, "status", None))
            in positive_statuses
            for row in group
        )
        return round(positives / len(group) * 100, 1)

    current_value = ratio(current)
    previous_value = ratio(previous)
    sample = len(current) + len(previous)
    if len(current) < 2 or len(previous) < 2:
        direction = TrendDirection.INSUFFICIENT_DATA
    else:
        delta = (current_value or 0) - (previous_value or 0)
        direction = (
            TrendDirection.IMPROVING
            if delta >= 10
            else TrendDirection.DECLINING
            if delta <= -10
            else TrendDirection.STABLE
        )
    return CareerTrend(
        direction=direction.value,
        current_value=current_value,
        comparison_value=previous_value,
        sample_size=sample,
        confidence=min(1, sample / 12),
    )


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)
