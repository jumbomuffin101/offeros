from types import SimpleNamespace

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from scripts import verify_career_intelligence_migration as career_verifier
from scripts import verify_mock_interview_intelligence_migration as mock_verifier
from scripts import verify_resume_intelligence_migration as resume_verifier
from scripts.migration_verification import log_database_target


def test_career_seed_commits_is_idempotent_and_verifies(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "career.db")
    configure_database(url, monkeypatch)
    upgrade("20260727_0017")

    career_verifier.seed()
    career_verifier.seed()
    career_verifier.confirm_seed()
    assert row_count(url, "users", "clerk_user_id", career_verifier.SEED_CLERK_USER_ID) == 1

    upgrade("20260730_0018")
    career_verifier.verify()


def test_career_verify_fails_clearly_without_seed(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "career-missing.db")
    configure_database(url, monkeypatch)
    upgrade("20260730_0018")

    with pytest.raises(RuntimeError) as exc_info:
        career_verifier.verify()
    message = str(exc_info.value)
    assert "User migration verification fixture" in message
    assert career_verifier.SEED_CLERK_USER_ID in message
    assert "verify-0018" in message
    assert career_verifier.TARGET_REVISION in message
    assert career_verifier.SEED_COMMAND in message


def test_mock_seed_commits_is_idempotent_and_verifies(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "mock.db")
    configure_database(url, monkeypatch)
    upgrade("20260730_0018")

    mock_verifier.seed()
    mock_verifier.seed()
    mock_verifier.confirm_seed()
    assert row_count(url, "mock_interview_sessions", "id", mock_verifier.SEED_SESSION_ID) == 1

    upgrade("20260803_0019")
    mock_verifier.verify()


def test_mock_verify_missing_fixture_raises_runtime_error_not_no_result(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "mock-missing.db")
    configure_database(url, monkeypatch)
    upgrade("20260803_0019")

    with pytest.raises(RuntimeError) as exc_info:
        mock_verifier.verify()
    message = str(exc_info.value)
    assert "MockInterviewSession migration verification fixture" in message
    assert mock_verifier.SEED_SESSION_ID in message
    assert "verify-legacy-session-0019" in message
    assert mock_verifier.TARGET_REVISION in message
    assert mock_verifier.SEED_COMMAND in message


def test_resume_intelligence_seed_commits_is_idempotent_and_verifies(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "resume-intelligence.db")
    configure_database(url, monkeypatch)
    upgrade("20260803_0019")

    resume_verifier.seed()
    resume_verifier.seed()
    resume_verifier.confirm_seed()
    assert row_count(url, "resume_analyses", "id", resume_verifier.SEED_ANALYSIS_ID) == 1

    upgrade("20260804_0020")
    resume_verifier.verify()


def test_wrong_revision_has_actionable_error(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url = sqlite_url(tmp_path / "wrong-revision.db")
    configure_database(url, monkeypatch)
    upgrade("20260727_0017")

    with pytest.raises(RuntimeError, match="expected Alembic revision 20260730_0018"):
        career_verifier.verify()


def test_database_diagnostics_do_not_print_credentials(capsys) -> None:
    engine = SimpleNamespace(
        url=make_url(
            "postgresql+psycopg://sensitive-user:sensitive-password@db.example.test:5432/offeros_test"
        )
    )
    log_database_target(engine, phase="test", target_revision="revision")
    output = capsys.readouterr().out
    assert "postgresql+psycopg" in output
    assert "db.example.test" in output
    assert "offeros_test" in output
    assert "sensitive-user" not in output
    assert "sensitive-password" not in output


def configure_database(url: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    settings = SimpleNamespace(database_url=url)
    monkeypatch.setattr(career_verifier, "get_settings", lambda: settings)
    monkeypatch.setattr(mock_verifier, "get_settings", lambda: settings)
    monkeypatch.setattr(resume_verifier, "get_settings", lambda: settings)


def upgrade(revision: str) -> None:
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), revision)


def sqlite_url(path) -> str:
    return f"sqlite:///{path.as_posix()}"


def row_count(url: str, table: str, column: str, value: str) -> int:
    allowed = {
        ("users", "clerk_user_id"),
        ("mock_interview_sessions", "id"),
        ("resume_analyses", "id"),
    }
    if (table, column) not in allowed:
        raise ValueError("Unsupported test count target")
    engine = create_engine(url)
    with engine.connect() as connection:
        count = connection.scalar(
            text(f"SELECT COUNT(*) FROM {table} WHERE {column} = :value"),
            {"value": value},
        )
    engine.dispose()
    return int(count or 0)
