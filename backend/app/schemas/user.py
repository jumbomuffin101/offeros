from datetime import datetime
from uuid import UUID

from pydantic import EmailStr

from app.schemas.common import ORMModel


class UserResponse(ORMModel):
    id: UUID
    clerk_user_id: str
    email: EmailStr
    name: str
    created_at: datetime
    updated_at: datetime
