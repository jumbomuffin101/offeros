import logging
import time
from uuid import UUID

from sqlalchemy.orm import Session

from app.career_intelligence.cache import get_cached, set_cached
from app.career_intelligence.context_builder import CareerContextBuilder
from app.career_intelligence.repository import CareerIntelligenceRepository
from app.career_intelligence.schemas import CareerContext


logger = logging.getLogger(__name__)


class CareerIntelligenceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def context(self, user_id: UUID, *, refresh: bool = False) -> CareerContext:
        if not refresh:
            try:
                cached = get_cached(user_id)
                if isinstance(cached, CareerContext):
                    return cached
            except Exception:
                logger.warning("career_intelligence.cache_read_failed user_id=%s", user_id)
        started = time.perf_counter()
        context = CareerContextBuilder(CareerIntelligenceRepository(self.db)).build(user_id)
        self.db.commit()
        try:
            set_cached(user_id, context)
        except Exception:
            logger.warning("career_intelligence.cache_write_failed user_id=%s", user_id)
        logger.info(
            "career_intelligence.context_built user_id=%s duration_ms=%d",
            user_id,
            round((time.perf_counter() - started) * 1000),
        )
        return context
