from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.books import router as books_router
from app.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler:
    Runs in READ-ONLY mode for database interactions.
    Does not attempt to create tables or modify/seed the database.
    """
    print("[STARTUP] Library API running in READ-ONLY mode.")
    print("[STARTUP] Connected to database for query/read operations.")
    yield
    print("[SHUTDOWN] Application shutdown complete.")


# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Book Borrowing & Library Management with AI Chat Assistant placeholder.",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(books_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }


@app.get("/api/health", tags=["Health Check"])
def health_check():
    return {
        "status": "healthy",
        "cors_origins": settings.CORS_ORIGINS
    }

