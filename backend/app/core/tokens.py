from cryptography.fernet import Fernet, InvalidToken

from app.core.errors import AppError


class TokenCipher:
    def __init__(self, key: str | None, integration: str = "Calendar") -> None:
        self.integration = integration
        if not key:
            raise AppError("integration_not_configured", f"{integration} token encryption is not configured.", 503)
        try:
            self.fernet = Fernet(key.encode())
        except (ValueError, TypeError) as exc:
            raise AppError("integration_not_configured", f"{integration} token encryption key is invalid.", 503) from exc

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        try:
            return self.fernet.decrypt(value.encode()).decode()
        except InvalidToken as exc:
            error_code = "calendar_token_invalid" if self.integration == "Calendar" else "gmail_token_invalid"
            raise AppError(error_code, f"Reconnect {self.integration} to continue.", 401) from exc
