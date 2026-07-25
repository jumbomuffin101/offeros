from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.launch import Notification
from app.schemas.application_attention import ApplicationAttentionItem
from app.schemas.launch import NotificationCreate, NotificationListResponse


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, user_id: UUID, *, unread_only: bool = False) -> NotificationListResponse:
        now = datetime.now(UTC)
        conditions = [
            Notification.user_id == user_id,
            or_(Notification.expires_at.is_(None), Notification.expires_at > now),
        ]
        if unread_only:
            conditions.append(Notification.read_at.is_(None))
        items = list(
            self.db.scalars(
                select(Notification)
                .where(*conditions)
                .order_by(Notification.created_at.desc())
                .limit(50)
            )
        )
        unread = int(
            self.db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.user_id == user_id,
                    Notification.read_at.is_(None),
                    or_(Notification.expires_at.is_(None), Notification.expires_at > now),
                )
            )
            or 0
        )
        return NotificationListResponse(items=items, unread_count=unread)

    def create(self, user_id: UUID, payload: NotificationCreate) -> Notification:
        if payload.dedupe_key:
            existing = self.db.scalar(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.dedupe_key == payload.dedupe_key,
                )
            )
            if existing is not None:
                return existing
        notification = Notification(user_id=user_id, **payload.model_dump())
        self.db.add(notification)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing = self.db.scalar(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.dedupe_key == payload.dedupe_key,
                )
            )
            if existing is not None:
                return existing
            raise
        self.db.refresh(notification)
        return notification

    def mark_read(self, user_id: UUID, notification_id: UUID) -> Notification:
        notification = self.db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        if notification is None:
            raise NotFoundError("Notification")
        notification.read_at = notification.read_at or datetime.now(UTC)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: UUID) -> int:
        result = self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(UTC))
        )
        self.db.commit()
        return result.rowcount or 0

    def reconcile_attention(
        self, user_id: UUID, items: list[ApplicationAttentionItem]
    ) -> None:
        notifiable = {
            "oa_deadline_soon",
            "interview_soon",
            "offer_deadline_soon",
            "follow_up_due",
        }
        for item in items:
            if item.category not in notifiable:
                continue
            self.create(
                user_id,
                NotificationCreate(
                    type=(
                        "deadline_approaching"
                        if item.category != "follow_up_due"
                        else "follow_up_due"
                    ),
                    title=item.title,
                    message=f"{item.company} - {item.role}: {item.description}",
                    application_id=item.application_id,
                    action_url=f"/applications?application={item.application_id}",
                    action_label=item.suggested_action,
                    dedupe_key=f"attention:{item.signal_key}",
                ),
            )
