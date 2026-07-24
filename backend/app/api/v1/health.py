from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas.common import HealthResponse
from app.schemas.launch import ReadinessResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(environment=settings.app_env, version="0.1.0")


@router.get("/ready", response_model=ReadinessResponse)
def readiness(
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> ReadinessResponse:
    try:
        db.execute(text("SELECT 1"))
        database = "reachable"
    except SQLAlchemyError:
        database = "unreachable"
    return ReadinessResponse(
        status="ready" if database == "reachable" else "not_ready",
        environment=settings.app_env,
        database=database,
        auth_configured=(
            not settings.auth_required
            or bool(
                settings.clerk_issuer
                and settings.clerk_jwks_url
                and settings.clerk_audience
            )
        ),
        ai_configured=bool(
            settings.ai_mock_enabled
            or (settings.ai_provider != "disabled" and settings.openrouter_api_key)
        ),
    )
