from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.config.settings import get_settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.database.indexes import create_database_indexes
from app.middleware.error_handler import register_exception_handlers
from app.routers.api import api_router
from app.utils.logger import setup_logging, get_logger

settings = get_settings()
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events cleanly.
    """
    logger.info("Starting up %s (version: %s)...", settings.PROJECT_NAME, settings.VERSION)
    await connect_to_mongo()
    await create_database_indexes()
    try:
        from app.services.user_service import user_service
        await user_service.seed_default_admin()
    except Exception as exc:
        logger.warning("Could not seed default admin: %s", exc)
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Exception Handlers
register_exception_handlers(app)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/api/docs", include_in_schema=False)
async def api_docs_redirect():
    """Redirect /api/docs to /docs for developer convenience."""
    return RedirectResponse(url="/docs")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint for basic service information."""
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": "Smart Scheduling. Zero Conflicts.",
        "documentation": "/docs",
        "health": f"{settings.API_PREFIX}/health",
        "summary": f"{settings.API_PREFIX}/dashboard/summary",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
