"""Health and readiness probes."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import check_database

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    database_ok = check_database()
    payload = {
        "status": "healthy" if database_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected" if database_ok else "unavailable",
    }
    return JSONResponse(status_code=200 if database_ok else 503, content=payload)
