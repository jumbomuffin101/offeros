from cryptography.fernet import Fernet, InvalidToken

from app.core.errors import AppError


class TokenCipher:
    def __init__(self, key: str | None) -> None:
        if not key:
            raise AppError("integration_not_configured", "Calendar token encryption is not configured.", 503)
        try:
            self.fernet = Fernet(key.encode())
        except (ValueError, TypeError) as exc:
            raise AppError("integration_not_configured", "TOKEN_ENCRYPTION_KEY is invalid.", 503) from exc

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        try:
            return self.fernet.decrypt(value.encode()).decode()
        except InvalidToken as exc:
            raise AppError("calendar_token_invalid", "Reconnect Google Calendar to continue.", 401) from exc
