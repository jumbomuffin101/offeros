from fastapi.testclient import TestClient


def test_app_starts_and_root_is_available(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "OfferOS API"


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "environment": "test",
        "service": "offeros-api",
        "version": "0.1.0",
    }
