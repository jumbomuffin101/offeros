from datetime import datetime

from app.schemas.common import ORMModel


class CalendarConnectResponse(ORMModel):
    authorization_url: str


class CalendarStatusResponse(ORMModel):
    provider: str = "google"
    connected: bool = False
    provider_account_email: str | None = None
    connection_status: str = "disconnected"
    token_expires_at: datetime | None = None
