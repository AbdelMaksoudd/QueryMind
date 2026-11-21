"""FastAPI application setup."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.books import router as books_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.api.loans import router as loans_router
from app.api.users import router as users_router
from app.config import settings
from app.database import check_database
from app.exceptions import LibraryError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting %s v%s", settings.PROJECT_NAME, settings.VERSION)
    if check_database():
        logger.info("Database connection verified.")
    else:
        logger.warning("Database is unreachable at startup; check DATABASE_URL.")
    yield
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Library catalog, borrowing and AI assistant API backed by PostgreSQL.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(LibraryError)
async def library_error_handler(request: Request, exc: LibraryError):
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(books_router, prefix=settings.API_PREFIX)
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(loans_router, prefix=settings.API_PREFIX)
app.include_router(chat_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
    }
