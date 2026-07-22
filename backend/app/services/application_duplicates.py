import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application


class ApplicationDuplicateService:
    """Find capture duplicates using stable signals, scoped to one user."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def find(
        self,
        user_id: UUID,
        *,
        job_url: str,
        source: str,
        external_job_id: str | None,
        company: str,
        role: str,
    ) -> Application | None:
        applications = list(
            self.db.scalars(
                select(Application).where(
                    Application.user_id == user_id,
                    Application.deleted_at.is_(None),
                )
            )
        )

        exact_url = next(
            (
                application
                for application in applications
                if application.job_url
                and normalize_job_url(application.job_url) == job_url
            ),
            None,
        )
        if exact_url:
            return exact_url

        if external_job_id:
            external_id_match = next(
                (
                    application
                    for application in applications
                    if application.source.lower() == source
                    and application.external_job_id == external_job_id
                ),
                None,
            )
            if external_id_match:
                return external_id_match

        normalized_company = normalize_name(company)
        normalized_role = normalize_name(role)
        return next(
            (
                application
                for application in applications
                if normalize_name(application.company) == normalized_company
                and normalize_name(application.role) == normalized_role
                and application.job_url
                and similar_job_url(application.job_url, job_url)
            ),
            None,
        )


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def normalize_job_url(value: str) -> str:
    parts = urlsplit(value.strip())
    query = urlencode(
        sorted(
            (key, item)
            for key, item in parse_qsl(parts.query)
            if not key.lower().startswith("utm_")
            and key.lower() not in {"ref", "source"}
        )
    )
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, query, ""))


def similar_job_url(left: str, right: str) -> bool:
    left_url = urlsplit(normalize_job_url(left))
    right_url = urlsplit(normalize_job_url(right))
    if left_url.netloc != right_url.netloc:
        return False

    ignored = {"job", "jobs", "position", "positions", "apply"}

    def path_tokens(path: str) -> set[str]:
        return {
            item
            for item in re.split(r"[^a-z0-9]+", path.lower())
            if len(item) > 2 and item not in ignored and not item.isdigit()
        }

    left_tokens = path_tokens(left_url.path)
    right_tokens = path_tokens(right_url.path)
    shared = left_tokens & right_tokens
    return (
        len(shared) >= 2
        and len(shared) / max(len(left_tokens | right_tokens), 1) >= 0.75
    )
