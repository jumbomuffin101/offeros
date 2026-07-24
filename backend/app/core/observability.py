import json
import logging
import re
from collections import defaultdict, deque
from hashlib import sha256
from time import perf_counter, time
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response


logger = logging.getLogger("offeros.request")
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{8,100}$")
AI_PATH_PARTS = (
    "/analyze",
    "/copilot",
    "/mock-interviews",
    "/prep-plan",
    "/upload",
)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        incoming = request.headers.get("x-request-id", "")
        request_id = incoming if REQUEST_ID_PATTERN.fullmatch(incoming) else str(uuid4())
        request.state.request_id = request_id
        started_at = perf_counter()
        response = await call_next(request)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            json.dumps(
                {
                    "event": "request_completed",
                    "environment": getattr(request.app.state, "environment", "unknown"),
                    "request_id": request_id,
                    "user_id": str(getattr(request.state, "user_id", "")) or None,
                    "endpoint": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "operation": _operation(request.url.path),
                    "resource_id": next(
                        (
                            str(value)
                            for key, value in request.path_params.items()
                            if key.endswith("_id")
                        ),
                        None,
                    ),
                    "provider": (
                        getattr(request.app.state, "ai_provider", None)
                        if _operation(request.url.path) == "ai"
                        else None
                    ),
                    "model": (
                        getattr(request.app.state, "ai_model", None)
                        if _operation(request.url.path) == "ai"
                        else None
                    ),
                    "error_code": None if response.status_code < 400 else f"http_{response.status_code}",
                },
                separators=(",", ":"),
            )
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    _requests: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.method == "OPTIONS" or request.url.path.endswith(("/health", "/ready")):
            return await call_next(request)
        window_seconds = 60
        limit = 30 if any(part in request.url.path for part in AI_PATH_PARTS) else 180
        key = self._key(request)
        bucket = self._requests[key]
        now = time()
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, round(window_seconds - (now - bucket[0])))
            request_id = getattr(request.state, "request_id", str(uuid4()))
            return JSONResponse(
                status_code=429,
                headers={
                    "Retry-After": str(retry_after),
                    "X-Request-ID": request_id,
                },
                content={
                    "error": {
                        "code": "rate_limit_reached",
                        "message": "OfferOS received too many requests. Try again shortly.",
                        "details": {"retry_after": retry_after},
                    }
                },
            )
        bucket.append(now)
        return await call_next(request)

    def _key(self, request: Request) -> str:
        authorization = request.headers.get("authorization", "")
        identity = (
            sha256(authorization.encode()).hexdigest()[:20]
            if authorization
            else request.client.host if request.client else "unknown"
        )
        operation = "ai" if any(part in request.url.path for part in AI_PATH_PARTS) else "api"
        return f"{identity}:{operation}"


def configure_sentry(dsn: str | None, environment: str) -> None:
    if not dsn:
        return
    try:
        import sentry_sdk
    except ImportError:
        logger.warning("SENTRY_DSN is configured but sentry-sdk is not installed.")
        return
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        send_default_pii=False,
        before_send=_scrub_sentry_event,
    )


def _scrub_sentry_event(event: dict, _hint: dict) -> dict:
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            for key in list(headers):
                if key.lower() in {"authorization", "cookie", "x-clerk-auth-status"}:
                    headers[key] = "[Filtered]"
    return event


def _operation(path: str) -> str:
    return "ai" if any(part in path for part in AI_PATH_PARTS) else "api"
