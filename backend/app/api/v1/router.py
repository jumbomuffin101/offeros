from fastapi import APIRouter

from app.api.v1 import ai, analytics, applications, health, prep, resume_analyses, resumes, settings, workspace


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(ai.router)
api_router.include_router(applications.router)
api_router.include_router(resumes.router)
api_router.include_router(resume_analyses.router)
api_router.include_router(prep.router)
api_router.include_router(analytics.router)
api_router.include_router(settings.router)
api_router.include_router(workspace.router)
