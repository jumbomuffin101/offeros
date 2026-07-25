import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.api.v1 import health as health_routes
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.observability import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    configure_sentry,
)


settings = get_settings()
logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
configure_sentry(settings.sentry_dsn, settings.app_env)

app = FastAPI(
    title="OfferOS API",
    description="Backend API for OfferOS technical recruiting workspace",
    version="0.1.0",
)
app.state.environment = settings.app_env
app.state.ai_provider = settings.ai_provider
app.state.ai_model = settings.ai_model
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

register_error_handlers(app)
app.include_router(health_routes.router)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {
        "name": "OfferOS API",
        "version": "0.1.0",
        "docs": "/docs",
    }
