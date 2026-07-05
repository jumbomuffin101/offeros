"""Backward-compatible imports for API routes using the auth dependency."""

from app.core.auth import DEMO_USER_ID, ClerkIdentity, get_clerk_identity, get_current_user, verify_clerk_jwt

__all__ = [
    "ClerkIdentity",
    "DEMO_USER_ID",
    "get_clerk_identity",
    "get_current_user",
    "verify_clerk_jwt",
]
