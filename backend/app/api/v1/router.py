from fastapi import APIRouter

from app.api.v1 import analytics, applications, health, prep, resumes, settings


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(applications.router)
api_router.include_router(resumes.router)
api_router.include_router(prep.router)
api_router.include_router(analytics.router)
api_router.include_router(settings.router)
