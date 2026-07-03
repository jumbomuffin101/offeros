from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))

    applications = relationship("Application", back_populates="user")
    resumes = relationship("ResumeVersion", back_populates="user")
    coding_problems = relationship("CodingProblem", back_populates="user")
    behavioral_questions = relationship("BehavioralQuestion", back_populates="user")
    system_design_prompts = relationship("SystemDesignPrompt", back_populates="user")
    settings = relationship("UserSettings", back_populates="user", uselist=False)
