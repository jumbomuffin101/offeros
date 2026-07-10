import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers


settings = get_settings()
logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="OfferOS API",
    description="Backend API for OfferOS technical recruiting workspace",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


def _assert_required_summary_routes(api_prefix: str) -> None:
    prefix = api_prefix.rstrip("/")
    required_paths = {
        f"{prefix}/dashboard/summary",
        f"{prefix}/analytics/summary",
    }
    registered_paths = {route.path for route in app.routes}
    missing_paths = sorted(required_paths - registered_paths)
    if missing_paths:
        raise RuntimeError(f"Required summary routes are not registered: {', '.join(missing_paths)}")


register_error_handlers(app)
app.include_router(api_router, prefix=settings.api_v1_prefix)
_assert_required_summary_routes(settings.api_v1_prefix)


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {
        "name": "OfferOS API",
        "version": "0.1.0",
        "docs": "/docs",
    }
