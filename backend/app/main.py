# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text

from .cache.redis import get_redis
from .config import settings
from .db.session import async_engine
from .routers import books, history, preferences, recommend, scan, test


def create_app() -> FastAPI:
    app = FastAPI(title="BookScanner API", version="0.2.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(scan.router, prefix="/v1")
    app.include_router(books.router, prefix="/v1")
    app.include_router(history.router, prefix="/v1")
    app.include_router(preferences.router, prefix="/v1")
    app.include_router(recommend.router, prefix="/v1")
    app.include_router(test.router, prefix="/v1")  # test endpoints

    # Health (Phase 1 requirement: {"ok": true})
    @app.get("/health")
    async def health():
        ok = True
        status = {"ok": ok}

        # Optional: DB check
        try:
            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as e:
            status["db"] = f"error:{e.__class__.__name__}"
            ok = False

        # Optional: Redis check
        try:
            r = get_redis()
            await r.ping()
        except Exception as e:
            status["redis"] = f"error:{e.__class__.__name__}"
            ok = False

        status["ok"] = ok
        return status

    # Metrics endpoint for Prometheus scraping
    @app.get("/metrics", response_class=PlainTextResponse)
    async def metrics():
        return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


app = create_app()
