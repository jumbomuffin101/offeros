from dataclasses import dataclass
from functools import lru_cache
from hashlib import sha256
from typing import Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.user import User


DEMO_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class ClerkIdentity:
    clerk_user_id: str
    email: str | None
    name: str | None
    claims: dict[str, Any]


@lru_cache(maxsize=8)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    """Cache Clerk signing keys; unknown key IDs trigger a JWKS refresh."""
    return PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=300)


def verify_clerk_jwt(token: str, settings: Settings) -> ClerkIdentity:
    if not settings.clerk_issuer or not settings.clerk_jwks_url or not settings.clerk_audience:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "auth_not_configured", "message": "Clerk JWT verification is not configured."},
        )

    try:
        signing_key = _jwks_client(settings.clerk_jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            audience=settings.clerk_audience,
            options={
                "verify_aud": True,
                "require": ["exp", "iat", "sub"],
            },
        )
    except (InvalidTokenError, PyJWKClientError, ValueError) as exc:
        raise _unauthorized("The Clerk session token is invalid or expired.") from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise _unauthorized("The Clerk session token is missing a subject.")

    return ClerkIdentity(
        clerk_user_id=subject,
        email=_optional_string(claims.get("email") or claims.get("email_address")),
        name=_claim_name(claims),
        claims=claims,
    )


def get_clerk_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> ClerkIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("A Clerk bearer token is required.")
    return verify_clerk_jwt(credentials.credentials, settings)


def get_current_user(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if not settings.auth_required:
        return _get_or_create_demo_user(db)

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("A Clerk bearer token is required.")

    identity = verify_clerk_jwt(credentials.credentials, settings)
    user = db.scalar(select(User).where(User.clerk_user_id == identity.clerk_user_id))
    return user or _create_clerk_user(db, identity)


def _get_or_create_demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        user = User(
            id=DEMO_USER_ID,
            clerk_user_id="demo_user",
            email="demo@offeros.local",
            name="Demo User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _create_clerk_user(db: Session, identity: ClerkIdentity) -> User:
    synthetic_email = f"clerk-{sha256(identity.clerk_user_id.encode()).hexdigest()[:24]}@users.offeros.local"
    email = identity.email or synthetic_email
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        email = synthetic_email

    user = User(
        clerk_user_id=identity.clerk_user_id,
        email=email,
        name=identity.name or (identity.email.split("@", 1)[0] if identity.email else "OfferOS User"),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        concurrent_user = db.scalar(
            select(User).where(User.clerk_user_id == identity.clerk_user_id)
        )
        if concurrent_user is None:
            raise
        return concurrent_user
    db.refresh(user)
    return user


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "unauthorized", "message": message},
        headers={"WWW-Authenticate": "Bearer"},
    )


def _optional_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _claim_name(claims: dict[str, Any]) -> str | None:
    direct_name = _optional_string(claims.get("name"))
    if direct_name:
        return direct_name
    parts = [
        value
        for value in (
            _optional_string(claims.get("given_name")),
            _optional_string(claims.get("family_name")),
        )
        if value
    ]
    return " ".join(parts) or None
