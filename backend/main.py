import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import get_settings
from database import engine, get_db
from models import (  # noqa: F401 — register mappers
    Document,
    Notification,
    Product,
    Shipment,
    ShipmentProduct,
    User,
)
from routers import api_router, auth as auth_router

logger = logging.getLogger("globaltradex")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema: apply migrations with `alembic upgrade head` (see backend/alembic/README).
    yield


app = FastAPI(
    title="GlobalTradeX API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if not isinstance(detail, str):
        detail = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": detail,
                "code": f"http_{exc.status_code}",
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "message": "Request validation failed",
                "code": "validation_error",
                "errors": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "An unexpected error occurred",
                "code": "internal_server_error",
            }
        },
    )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "GlobalTradeX API is running",
        "version": "1.0.0",
    }


@app.get("/api/health", response_model=None)
def api_health() -> JSONResponse | dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )
    return {"status": "healthy", "database": "connected"}


def _test_db_connection_info() -> tuple[str, str]:
    """Return (database_name, host_display) from DATABASE_URL / database_url."""
    settings = get_settings()
    url = make_url(settings.database_url)
    if url.drivername.startswith("sqlite"):
        db_name = (url.database or "sqlite").split("/")[-1] or "sqlite"
        host_display = f"sqlite:{url.database or ''}"
        return db_name, host_display
    db_name = url.database or "globaltradex"
    host = url.host or "localhost"
    port = url.port or 3306
    return db_name, f"{host}:{port}"


@app.get("/api/test-db")
def test_db(db: Session = Depends(get_db)) -> dict[str, str | int]:
    """Verify DB connectivity (e.g. XAMPP MySQL). No authentication."""
    try:
        db.execute(text("SELECT 1"))
        users_count = db.scalar(select(func.count()).select_from(User)) or 0
        shipments_count = db.scalar(select(func.count()).select_from(Shipment)) or 0
        database, mysql_host = _test_db_connection_info()
        return {
            "database": database,
            "users_count": users_count,
            "shipments_count": shipments_count,
            "mysql_host": mysql_host,
            "status": "XAMPP MySQL connected successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_router, prefix="/api")
