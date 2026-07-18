from datetime import UTC, datetime

from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.models.user import User


def test_connect_profile_rejects_invalid_username(client: TestClient) -> None:
    response = client.post("/api/v1/prep/coding-profile/connect", json={"provider": "leetcode", "username": "not valid!"})

    assert response.status_code == 422


def test_connect_profile_and_manual_activity_feed_summary(client: TestClient) -> None:
    connection = client.post("/api/v1/prep/coding-profile/connect", json={"provider": "leetcode", "username": "offer_user"})
    activity = client.post(
        "/api/v1/prep/coding-activities",
        json={"problem_title": "Two Sum", "problem_url": "https://leetcode.com/problems/two-sum/", "difficulty": "easy", "topics": ["Arrays", "Hash Map"], "status": "solved", "time_spent_minutes": 20},
    )

    assert connection.status_code == 200
    assert connection.json()["data"]["profile_url"] == "https://leetcode.com/u/offer_user/"
    assert connection.json()["data"]["connection_status"] == "connected"
    assert connection.json()["data"]["sync_status"] == "unsupported"
    assert activity.status_code == 201

    summary = client.get("/api/v1/prep/coding-summary")
    assert summary.status_code == 200
    assert summary.json()["data"]["total_solved"] == 1
    assert summary.json()["data"]["difficulty_breakdown"]["easy"] == 1
    assert summary.json()["data"]["topic_coverage"]["Arrays"] == 1


def test_connect_profile_updates_existing_connection(client: TestClient) -> None:
    first = client.post("/api/v1/prep/coding-profile/connect", json={"provider": "leetcode", "username": "first_user"})
    second = client.post("/api/v1/prep/coding-profile/connect", json={"provider": "leetcode", "username": "second_user"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["data"]["username"] == "second_user"
    assert client.get("/api/v1/prep/coding-profile").json()["data"]["username"] == "second_user"


def test_import_skips_duplicate_rows(client: TestClient) -> None:
    payload = {"rows": [
        {"problem_title": "Valid Parentheses", "difficulty": "easy", "topics": ["Stack"], "status": "solved", "solved_at": "2026-07-18T00:00:00Z"},
        {"problem_title": "Valid Parentheses", "difficulty": "easy", "topics": ["Stack"], "status": "solved", "solved_at": "2026-07-18T00:00:00Z"},
    ]}

    response = client.post("/api/v1/prep/coding-activities/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"] == {"imported": 1, "skipped_duplicates": 1, "failed": 0}
    assert client.get("/api/v1/prep/coding-activities").json()["data"]["total"] == 1


def test_coding_activities_are_user_scoped(client: TestClient) -> None:
    created = client.post("/api/v1/prep/coding-activities", json={"problem_title": "Merge Intervals", "difficulty": "medium", "solved_at": datetime.now(UTC).isoformat()})
    assert created.status_code == 201

    app.dependency_overrides[get_current_user] = _second_user
    try:
        response = client.get("/api/v1/prep/coding-activities")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json()["data"]["items"] == []


def test_activity_can_be_updated_and_soft_deleted(client: TestClient) -> None:
    created = client.post("/api/v1/prep/coding-activities", json={"problem_title": "Two Sum", "difficulty": "easy", "solved_at": datetime.now(UTC).isoformat()})
    activity_id = created.json()["data"]["id"]

    updated = client.patch(f"/api/v1/prep/coding-activities/{activity_id}", json={"difficulty": "medium", "topics": ["Arrays", "Hash Map"], "time_spent_minutes": 25})
    deleted = client.delete(f"/api/v1/prep/coding-activities/{activity_id}")

    assert updated.status_code == 200
    assert updated.json()["data"]["difficulty"] == "medium"
    assert deleted.status_code == 204
    assert client.get("/api/v1/prep/coding-summary").json()["data"]["total_solved"] == 0


def test_summary_uses_current_week_activity_and_disconnect_preserves_history(client: TestClient) -> None:
    client.post("/api/v1/prep/coding-profile/connect", json={"provider": "leetcode", "username": "practice_user"})
    client.post("/api/v1/prep/coding-activities", json={"problem_title": "Daily Temperatures", "difficulty": "medium", "topics": ["Stack"], "status": "attempted", "attempted_at": datetime.now(UTC).isoformat(), "time_spent_minutes": 35})

    summary = client.get("/api/v1/prep/coding-summary")
    disconnected = client.delete("/api/v1/prep/coding-profile")

    assert summary.status_code == 200
    assert summary.json()["data"]["minutes_this_week"] == 35
    assert summary.json()["data"]["practice_streak_days"] >= 1
    assert disconnected.status_code == 204
    assert client.get("/api/v1/prep/coding-activities").json()["data"]["total"] == 1


def _second_user(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.clerk_user_id == "coding_test_user_2"))
    if user is None:
        user = User(clerk_user_id="coding_test_user_2", email="coding-test-user-2@example.test", name="Coding Test User 2")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
