"""Smoke-test a deployed OfferOS API using only the Python standard library."""

from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def request_json(url: str, token: str | None = None) -> tuple[int, object | None]:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(url, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            body = response.read()
            return response.status, json.loads(body) if body else None
    except HTTPError as error:
        body = error.read()
        try:
            payload = json.loads(body) if body else None
        except json.JSONDecodeError:
            payload = body.decode("utf-8", errors="replace")
        return error.code, payload
    except URLError as error:
        raise RuntimeError(f"Could not reach {url}: {error.reason}") from error


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.getenv("OFFEROS_API_BASE_URL", "http://localhost:8000/api/v1"),
        help="Versioned API base URL (default: OFFEROS_API_BASE_URL or localhost)",
    )
    parser.add_argument(
        "--auth-required",
        action="store_true",
        help="Require the unauthenticated applications request to return 401",
    )
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    token = os.getenv("OFFEROS_SMOKE_TOKEN")

    try:
        health_status, health = request_json(f"{base_url}/health")
        require(health_status == 200, f"Health returned HTTP {health_status}: {health}")
        require(isinstance(health, dict), "Health response was not a JSON object")
        require(health.get("status") == "ok", f"Unexpected health payload: {health}")
        for field in ("environment", "service", "version"):
            require(bool(health.get(field)), f"Health response is missing {field}")
        print(f"PASS health: {health}")

        anonymous_status, anonymous = request_json(f"{base_url}/applications")
        if args.auth_required:
            require(
                anonymous_status == 401,
                f"Anonymous applications request returned {anonymous_status}: {anonymous}",
            )
            print("PASS anonymous protection: HTTP 401")
        else:
            require(
                anonymous_status in (200, 401),
                f"Anonymous applications request returned {anonymous_status}: {anonymous}",
            )
            print(f"PASS anonymous applications behavior: HTTP {anonymous_status}")

        if token:
            authenticated_status, authenticated = request_json(
                f"{base_url}/applications", token
            )
            require(
                authenticated_status == 200,
                f"Authenticated applications request returned "
                f"{authenticated_status}: {authenticated}",
            )
            require(isinstance(authenticated, list), "Applications response was not a list")
            print(f"PASS authenticated applications: {len(authenticated)} record(s)")
        else:
            print("SKIP authenticated applications: OFFEROS_SMOKE_TOKEN is not set")
    except RuntimeError as error:
        print(f"FAIL {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
