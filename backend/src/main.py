"""CS2 Tournament Hub — API REST + Socket.IO.
Rodar:  uvicorn src.main:asgi_app --reload --port 8000   (dentro de backend/)
Docs:   http://localhost:8000/docs
"""
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (registra os mappers)
from .config.settings import settings
from .routes import auth_routes, matches_routes, recruiting_routes, teams_routes, tournaments_routes
from .sockets.match_socket import sio

app = FastAPI(title="CS2 Tournament Hub API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

for r in (auth_routes.router, auth_routes.players, teams_routes.router, recruiting_routes.router,
          tournaments_routes.router, matches_routes.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}


asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
