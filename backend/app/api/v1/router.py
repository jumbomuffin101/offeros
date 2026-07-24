from fastapi import APIRouter

from app.api.v1 import account, ai, analytics, application_copilot, application_events, applications, coding_intelligence, dashboard, focus, health, inbox, integrations, mock_interviews, notifications, prep, resume_analyses, resumes, settings, workspace


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(ai.router)
api_router.include_router(applications.router)
api_router.include_router(application_copilot.router)
api_router.include_router(application_events.router)
api_router.include_router(integrations.router)
api_router.include_router(focus.router)
api_router.include_router(inbox.router)
api_router.include_router(mock_interviews.router)
api_router.include_router(notifications.router)
api_router.include_router(account.router)
api_router.include_router(resumes.router)
api_router.include_router(resume_analyses.router)
api_router.include_router(prep.router)
api_router.include_router(coding_intelligence.router)
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"],
)
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["analytics"],
)
api_router.include_router(settings.router)
api_router.include_router(workspace.router)
