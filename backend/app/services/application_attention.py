from __future__ import annotations

import hashlib
import logging
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.models.application import Application
from app.models.application_attention import ApplicationAttentionOverride
from app.models.application_event import ApplicationEvent
from app.models.application_prep import ApplicationPrepPlan
from app.models.coding import CodingActivity
from app.models.prep import BehavioralQuestion, SystemDesignPrompt
from app.models.gmail import GmailApplicationSuggestion
from app.schemas.application_attention import (
    ApplicationAttentionItem,
    ApplicationAttentionOverrideRequest,
    ApplicationAttentionSummary,
    ApplicationInboxResponse,
)


logger = logging.getLogger(__name__)

FOLLOW_UP_APPLIED_DAYS = 10
FOLLOW_UP_INTERVIEW_DAYS = 3
STALE_APPLICATION_DAYS = 21
DEADLINE_WINDOW_HOURS = 72
OFFER_WINDOW_HOURS = 48
LOW_PREP_THRESHOLD = 60

INTERVIEW_EVENT_TYPES = {
    "recruiter_screen",
    "technical_interview",
    "behavioral_interview",
    "system_design_interview",
    "final_round",
}
MEANINGFUL_EVENT_TYPES = {
    "applied",
    "oa_received",
    "oa_deadline",
    "oa_completed",
    *INTERVIEW_EVENT_TYPES,
    "follow_up",
    "offer_received",
    "offer_deadline",
    "rejected",
    "withdrawn",
}
ACTIVE_STATUSES = {"applying", "applied", "oa", "interview", "final_round"}
EVENT_RELEVANT_STATUSES = ACTIVE_STATUSES | {"wishlist"}


class ApplicationAttentionService:
    def __init__(self, db: Session, now: datetime | None = None) -> None:
        self.db = db
        self.now = _as_utc(now or datetime.now(UTC))

    def inbox(self, user_id: UUID) -> ApplicationInboxResponse:
        items = self.build(user_id)
        return ApplicationInboxResponse(
            items=items,
            summary=ApplicationAttentionSummary(
                critical=sum(item.priority >= 90 for item in items),
                high=sum(60 <= item.priority < 90 for item in items),
                medium=sum(item.priority < 60 for item in items),
                total=len(items),
            ),
        )

    def build(
        self,
        user_id: UUID,
        *,
        applications: list[Application] | None = None,
        include_overridden: bool = False,
    ) -> list[ApplicationAttentionItem]:
        applications = applications if applications is not None else list(
            self.db.scalars(
                select(Application).where(
                    Application.user_id == user_id,
                    Application.deleted_at.is_(None),
                )
            )
        )
        if not applications:
            return []
        application_ids = [application.id for application in applications]
        events = list(
            self.db.scalars(
                select(ApplicationEvent).where(
                    ApplicationEvent.user_id == user_id,
                    ApplicationEvent.application_id.in_(application_ids),
                    ApplicationEvent.deleted_at.is_(None),
                )
            )
        )
        plans = list(
            self.db.scalars(
                select(ApplicationPrepPlan).where(
                    ApplicationPrepPlan.user_id == user_id,
                    ApplicationPrepPlan.application_id.in_(application_ids),
                )
            )
        )
        overrides = list(
            self.db.scalars(
                select(ApplicationAttentionOverride).where(
                    ApplicationAttentionOverride.user_id == user_id,
                    ApplicationAttentionOverride.application_id.in_(application_ids),
                )
            )
        )
        events_by_application: dict[UUID, list[ApplicationEvent]] = defaultdict(list)
        for event in events:
            events_by_application[event.application_id].append(event)
        plans_by_application = {plan.application_id: plan for plan in plans}
        try:
            readiness = self._prep_readiness(user_id, plans)
        except Exception:
            logger.exception(
                "application_attention.prep_readiness_unavailable user_id=%s",
                user_id,
            )
            readiness = {}
        override_by_signal = {
            (override.application_id, override.category): override
            for override in overrides
        }

        items: list[ApplicationAttentionItem] = []
        for application in applications:
            application_items = self._application_items(
                application,
                events_by_application.get(application.id, []),
                plans_by_application.get(application.id),
                readiness.get(application.id),
            )
            for item in application_items:
                override = override_by_signal.get(
                    (application.id, item.category)
                )
                if (
                    not include_overridden
                    and override is not None
                    and override.signal_key == item.signal_key
                    and (
                        override.dismissed_until is None
                        or _as_utc(override.dismissed_until) > self.now
                    )
                ):
                    continue
                items.append(item)
        applications_by_id = {application.id: application for application in applications}
        try:
            gmail_suggestions = list(
                self.db.scalars(
                    select(GmailApplicationSuggestion).where(
                        GmailApplicationSuggestion.user_id == user_id,
                        GmailApplicationSuggestion.status == "pending",
                        GmailApplicationSuggestion.application_id.in_(application_ids),
                    )
                )
            )
        except SQLAlchemyError:
            self.db.rollback()
            logger.warning("application_attention.gmail_unavailable user_id=%s", user_id)
            gmail_suggestions = []
        regular_gmail_suggestions: list[GmailApplicationSuggestion] = []
        for suggestion in gmail_suggestions:
            application = applications_by_id.get(suggestion.application_id)
            if application is None:
                continue
            due_at = suggestion.suggested_deadline_at or suggestion.suggested_event_at
            urgent = due_at is not None and _as_utc(due_at) <= self.now + timedelta(hours=72)
            urgent = urgent and suggestion.email_type in {"offer", "assessment_invitation", "interview_invitation"}
            if not urgent:
                regular_gmail_suggestions.append(suggestion)
                continue
            priority = 92
            signal_key = hashlib.sha256(
                f"gmail:{suggestion.id}:{suggestion.version}".encode()
            ).hexdigest()
            items.append(
                ApplicationAttentionItem(
                    id=f"gmail:{suggestion.id}",
                    application_id=application.id,
                    company=application.company,
                    role=application.role,
                    category="gmail_review",
                    priority=priority,
                    title=f"{suggestion.email_type.replace('_', ' ').title()} detected",
                    description="Review this Gmail suggestion before OfferOS changes the application timeline.",
                    due_at=due_at,
                    created_at=suggestion.created_at,
                    suggested_action="Review Gmail suggestion",
                    last_meaningful_activity=application.meaningful_updated_at,
                    signal_key=signal_key,
                )
            )
        if regular_gmail_suggestions:
            first = regular_gmail_suggestions[0]
            application = applications_by_id[first.application_id]
            count = len(regular_gmail_suggestions)
            signal_key = hashlib.sha256(
                ("gmail:review:" + ":".join(sorted(str(value.id) for value in regular_gmail_suggestions))).encode()
            ).hexdigest()
            items.append(
                ApplicationAttentionItem(
                    id="gmail:review",
                    application_id=application.id,
                    company="Gmail",
                    role="Recruiting email review",
                    category="gmail_review",
                    priority=58,
                    title=f"{count} recruiting email{'s' if count != 1 else ''} need review",
                    description="Review Gmail suggestions before they affect application timelines or statuses.",
                    created_at=max(value.created_at for value in regular_gmail_suggestions),
                    suggested_action="Review emails",
                    signal_key=signal_key,
                )
            )
        return sorted(
            items,
            key=lambda item: (
                -item.priority,
                _as_utc(item.due_at).timestamp()
                if item.due_at is not None
                else float("inf"),
                item.company.lower(),
            ),
        )

    def override(
        self, user_id: UUID, payload: ApplicationAttentionOverrideRequest
    ) -> ApplicationInboxResponse:
        current = next(
            (
                item
                for item in self.build(user_id, include_overridden=True)
                if item.application_id == payload.application_id
                and item.category == payload.category
            ),
            None,
        )
        if current is None:
            raise NotFoundError("Attention item")
        if payload.action == "snooze" and payload.duration is None:
            raise ValidationError("Choose how long to snooze this item.")
        dismissed_until = (
            self.now + _snooze_duration(payload.duration)
            if payload.action == "snooze" and payload.duration
            else None
        )
        override = self.db.scalar(
            select(ApplicationAttentionOverride).where(
                ApplicationAttentionOverride.user_id == user_id,
                ApplicationAttentionOverride.application_id
                == payload.application_id,
                ApplicationAttentionOverride.category == payload.category,
            )
        )
        if override is None:
            override = ApplicationAttentionOverride(
                user_id=user_id,
                application_id=payload.application_id,
                category=payload.category,
                signal_key=current.signal_key,
                dismissed_at=self.now,
                dismissed_until=dismissed_until,
            )
            self.db.add(override)
        else:
            override.signal_key = current.signal_key
            override.dismissed_at = self.now
            override.dismissed_until = dismissed_until
        self.db.commit()
        return self.inbox(user_id)

    def _application_items(
        self,
        application: Application,
        events: list[ApplicationEvent],
        plan: ApplicationPrepPlan | None,
        prep_readiness: int | None,
    ) -> list[ApplicationAttentionItem]:
        status = _value(application.status)
        upcoming = [
            event
            for event in events
            if event.status == "upcoming"
        ]
        completed = [
            event
            for event in events
            if event.status == "completed" or event.completed_at is not None
        ]
        last_activity, last_activity_label = self._last_activity(application, events)
        days_since_update = max(
            0, int((self.now - last_activity).total_seconds() // 86_400)
        )
        follow_up_count = sum(event.event_type == "follow_up" for event in events)
        items: list[ApplicationAttentionItem] = []

        oa_deadline = _relevant_event(
            [event for event in upcoming if event.event_type == "oa_deadline"],
            self.now,
            DEADLINE_WINDOW_HOURS,
        )
        interview = _relevant_event(
            [
                event
                for event in upcoming
                if event.event_type in INTERVIEW_EVENT_TYPES
            ],
            self.now,
            DEADLINE_WINDOW_HOURS,
        )
        offer_deadline = _relevant_event(
            [event for event in upcoming if event.event_type == "offer_deadline"],
            self.now,
            OFFER_WINDOW_HOURS,
        )

        if oa_deadline is not None and status in EVENT_RELEVANT_STATUSES:
            hours = _hours_until(oa_deadline.scheduled_at, self.now)
            priority = 100 if hours < 0 else 90 if hours <= 24 else 75
            items.append(self._item(
                application,
                "oa_deadline_soon",
                priority,
                "Online assessment deadline",
                _deadline_description("OA", hours),
                "Open prep",
                last_activity,
                days_since_update,
                follow_up_count,
                event=oa_deadline,
            ))
        if interview is not None and status in EVENT_RELEVANT_STATUSES:
            hours = _hours_until(interview.scheduled_at, self.now)
            priority = 100 if hours < 0 else 85 if hours <= 24 else 80
            items.append(self._item(
                application,
                "interview_soon",
                priority,
                interview.title,
                _deadline_description("Interview", hours),
                "Open prep plan",
                last_activity,
                days_since_update,
                follow_up_count,
                event=interview,
            ))
        if offer_deadline is not None:
            hours = _hours_until(offer_deadline.scheduled_at, self.now)
            priority = 100 if hours < 0 else 95 if hours <= 24 else 85
            items.append(self._item(
                application,
                "offer_deadline_soon",
                priority,
                "Offer decision deadline",
                _deadline_description("Offer deadline", hours),
                "Open application",
                last_activity,
                days_since_update,
                follow_up_count,
                event=offer_deadline,
            ))

        if status == "applied" and application.date_applied is not None:
            applied_at = _date_as_datetime(application.date_applied)
            meaningful_after_apply = any(
                event.event_type in MEANINGFUL_EVENT_TYPES
                and event.event_type != "applied"
                and _event_activity_at(event) > applied_at
                for event in events
            )
            if (
                self.now - applied_at >= timedelta(days=FOLLOW_UP_APPLIED_DAYS)
                and not meaningful_after_apply
            ):
                items.append(self._item(
                    application,
                    "follow_up_due",
                    60,
                    "Follow-up due",
                    f"Applied {int((self.now - applied_at).total_seconds() // 86_400)} days ago with no newer recruiting activity.",
                    "Draft follow-up",
                    last_activity,
                    days_since_update,
                    follow_up_count,
                ))

        if status == "interview":
            completed_interviews = [
                event for event in completed
                if event.event_type in INTERVIEW_EVENT_TYPES
            ]
            if completed_interviews:
                latest_interview = max(
                    completed_interviews, key=_event_activity_at
                )
                interview_at = _event_activity_at(latest_interview)
                newer_progress = any(
                    event.id != latest_interview.id
                    and event.event_type in MEANINGFUL_EVENT_TYPES
                    and _event_activity_at(event) > interview_at
                    for event in events
                )
                if (
                    self.now - interview_at
                    >= timedelta(days=FOLLOW_UP_INTERVIEW_DAYS)
                    and not newer_progress
                    and not any(item.category == "follow_up_due" for item in items)
                ):
                    items.append(self._item(
                        application,
                        "follow_up_due",
                        60,
                        "Interview follow-up due",
                        f"{latest_interview.title} was {int((self.now - interview_at).total_seconds() // 86_400)} days ago.",
                        "Draft follow-up",
                        last_activity,
                        days_since_update,
                        follow_up_count,
                        event=latest_interview,
                    ))

        if status in ACTIVE_STATUSES:
            if application.resume_version_id is None:
                items.append(self._item(
                    application, "missing_resume", 40, "Select a resume",
                    "This active application has no targeted resume selected.",
                    "Select resume", last_activity, days_since_update, follow_up_count,
                ))
            if not application.job_description.strip():
                items.append(self._item(
                    application, "missing_job_description", 40,
                    "Add the job description",
                    "OfferOS needs the role requirements for targeted analysis and prep.",
                    "Add job description", last_activity, days_since_update, follow_up_count,
                ))
            if (
                application.resume_version_id is not None
                and application.job_description.strip()
                and application.resume_analysis_id is None
            ):
                items.append(self._item(
                    application, "needs_resume_analysis", 45,
                    "Analyze resume fit",
                    "Resume and job description are ready for role-specific analysis.",
                    "Analyze resume", last_activity, days_since_update, follow_up_count,
                ))
            if status in {"oa", "interview", "final_round"} and plan is None:
                items.append(self._item(
                    application, "needs_prep_plan", 50,
                    "Generate an interview prep plan",
                    "This active interview stage does not have a targeted prep plan.",
                    "Generate prep plan", last_activity, days_since_update, follow_up_count,
                ))
            if (
                interview is not None
                and plan is not None
                and prep_readiness is not None
                and prep_readiness < LOW_PREP_THRESHOLD
            ):
                items.append(self._item(
                    application, "low_prep_readiness", 70,
                    "Prep readiness needs attention",
                    f"Interview is within 72 hours and readiness is {prep_readiness}%.",
                    "Open prep plan", last_activity, days_since_update, follow_up_count,
                    event=interview, extra_signal=str(prep_readiness),
                ))
            if days_since_update >= STALE_APPLICATION_DAYS:
                items.append(self._item(
                    application, "stale_application", 30,
                    "Application is stale",
                    f"No meaningful recruiting progress for {days_since_update} days. Last activity: {last_activity_label}.",
                    "Review application", last_activity, days_since_update, follow_up_count,
                ))
        days_to_first_response, days_from_interview_to_outcome = (
            _attention_timing_metrics(application, events)
        )
        for item in items:
            item.days_to_first_response = days_to_first_response
            item.days_from_interview_to_outcome = days_from_interview_to_outcome
        return items

    def _item(
        self,
        application: Application,
        category: str,
        priority: int,
        title: str,
        description: str,
        suggested_action: str,
        last_activity: datetime,
        days_since_update: int,
        follow_up_count: int,
        *,
        event: ApplicationEvent | None = None,
        extra_signal: str = "",
    ) -> ApplicationAttentionItem:
        state = "|".join([
            str(application.id),
            category,
            _value(application.status),
            str(application.resume_version_id or ""),
            str(application.resume_analysis_id or ""),
            str(bool(application.job_description.strip())),
            last_activity.isoformat(),
            str(event.id if event else ""),
            event.status if event else "",
            _as_utc(event.scheduled_at).isoformat() if event else "",
            extra_signal,
        ])
        return ApplicationAttentionItem(
            id=f"{application.id}:{category}",
            application_id=application.id,
            company=application.company,
            role=application.role,
            category=category,  # type: ignore[arg-type]
            priority=priority,
            title=title,
            description=description,
            due_at=event.scheduled_at if event else None,
            created_at=last_activity,
            suggested_action=suggested_action,
            last_meaningful_activity=last_activity,
            days_since_update=days_since_update,
            follow_up_count=follow_up_count,
            signal_key=hashlib.sha256(state.encode()).hexdigest(),
        )

    def _last_activity(
        self, application: Application, events: list[ApplicationEvent]
    ) -> tuple[datetime, str]:
        candidates: list[tuple[datetime, str]] = [
            (_as_utc(application.created_at), "Application created")
        ]
        if application.meaningful_updated_at is not None:
            candidates.append(
                (_as_utc(application.meaningful_updated_at), "Status updated")
            )
        if application.date_applied is not None:
            candidates.append(
                (_date_as_datetime(application.date_applied), "Application submitted")
            )
        for event in events:
            if event.event_type not in MEANINGFUL_EVENT_TYPES:
                continue
            activity_at = _event_activity_at(event)
            if activity_at <= self.now:
                candidates.append((activity_at, event.title))
        return max(candidates, key=lambda candidate: candidate[0])

    def _prep_readiness(
        self, user_id: UUID, plans: list[ApplicationPrepPlan]
    ) -> dict[UUID, int]:
        if not plans:
            return {}
        activities = list(
            self.db.scalars(
                select(CodingActivity).where(
                    CodingActivity.user_id == user_id,
                    CodingActivity.deleted_at.is_(None),
                )
            )
        )
        behavioral = list(
            self.db.scalars(
                select(BehavioralQuestion).where(
                    BehavioralQuestion.user_id == user_id,
                    BehavioralQuestion.deleted_at.is_(None),
                )
            )
        )
        designs = list(
            self.db.scalars(
                select(SystemDesignPrompt).where(
                    SystemDesignPrompt.user_id == user_id,
                    SystemDesignPrompt.deleted_at.is_(None),
                )
            )
        )
        result: dict[UUID, int] = {}
        for plan in plans:
            coding_rows = [
                sum(
                    str(item.get("topic", "")).lower()
                    in " ".join(activity.topics or []).lower()
                    for activity in activities
                ) >= 2
                for item in plan.coding.get("priority_topics", [])
                if isinstance(item, dict)
            ]
            behavioral_rows = [
                any(
                    str(item.get("category", "")).lower()
                    in f"{story.category} {story.question}".lower()
                    for story in behavioral
                )
                for item in plan.behavioral.get("focus_areas", [])
                if isinstance(item, dict)
            ]
            design_rows = [
                any(
                    str(item.get("topic", "")).lower()
                    in f"{prompt.title} {prompt.prompt} {' '.join(prompt.concepts or [])}".lower()
                    for prompt in designs
                )
                for item in plan.system_design.get("focus_areas", [])
                if isinstance(item, dict)
            ]
            result[plan.application_id] = round(
                _coverage_score(coding_rows) * 0.5
                + _coverage_score(behavioral_rows) * 0.3
                + _coverage_score(design_rows) * 0.2
            )
        return result


def _coverage_score(values: list[bool]) -> int:
    return round(100 * sum(values) / len(values)) if values else 50


def _relevant_event(
    events: list[ApplicationEvent], now: datetime, window_hours: int
) -> ApplicationEvent | None:
    candidates = [
        event
        for event in events
        if _hours_until(event.scheduled_at, now) <= window_hours
    ]
    if not candidates:
        return None
    overdue = [event for event in candidates if _hours_until(event.scheduled_at, now) < 0]
    if overdue:
        return max(overdue, key=lambda event: _as_utc(event.scheduled_at))
    return min(candidates, key=lambda event: _as_utc(event.scheduled_at))


def _deadline_description(label: str, hours: float) -> str:
    if hours < 0:
        return f"{label} is overdue."
    if hours <= 24:
        return f"{label} is due within 24 hours."
    return f"{label} is due within {max(2, round(hours / 24))} days."


def _event_activity_at(event: ApplicationEvent) -> datetime:
    return _as_utc(event.completed_at or event.scheduled_at or event.created_at)


def _attention_timing_metrics(
    application: Application,
    events: list[ApplicationEvent],
) -> tuple[int | None, int | None]:
    applied_at = (
        _date_as_datetime(application.date_applied)
        if application.date_applied is not None
        else _as_utc(application.created_at)
    )
    response_events = [
        event
        for event in events
        if event.event_type
        in {
            "oa_received",
            "oa_completed",
            *INTERVIEW_EVENT_TYPES,
            "offer_received",
            "rejected",
        }
        and _event_activity_at(event) >= applied_at
    ]
    days_to_first_response = (
        max(
            0,
            int(
                (
                    min(_event_activity_at(event) for event in response_events)
                    - applied_at
                ).total_seconds()
                // 86_400
            ),
        )
        if response_events
        else None
    )
    interviews = [
        event
        for event in events
        if event.event_type in INTERVIEW_EVENT_TYPES
        and (event.status == "completed" or event.completed_at is not None)
    ]
    outcomes = [
        event
        for event in events
        if event.event_type in {"offer_received", "rejected"}
    ]
    pairs = [
        (_event_activity_at(interview), _event_activity_at(outcome))
        for interview in interviews
        for outcome in outcomes
        if _event_activity_at(outcome) >= _event_activity_at(interview)
    ]
    days_from_interview_to_outcome = (
        min(
            int((outcome_at - interview_at).total_seconds() // 86_400)
            for interview_at, outcome_at in pairs
        )
        if pairs
        else None
    )
    return days_to_first_response, days_from_interview_to_outcome


def _hours_until(value: datetime, now: datetime) -> float:
    return (_as_utc(value) - now).total_seconds() / 3_600


def _date_as_datetime(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=UTC)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _value(value: object) -> str:
    return str(getattr(value, "value", value))


def _snooze_duration(
    duration: str,
) -> timedelta:
    return {
        "tomorrow": timedelta(days=1),
        "3_days": timedelta(days=3),
        "1_week": timedelta(days=7),
    }[duration]
