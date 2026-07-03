from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


DEMO_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def get_current_user(db: Session = Depends(get_db)) -> User:
    """Return a deterministic local user until Clerk JWT validation is implemented."""
    # TODO(auth): Replace this dependency with Clerk JWT verification and user lookup.
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        user = User(
            id=DEMO_USER_ID,
            clerk_user_id="demo_user",
            email="demo@offeros.local",
            name="Demo User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
