from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api import calendar
import os

origins_str = os.getenv("CORS_ORIGINS", "")
origins = origins_str.split(",") if origins_str else []

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(calendar.router)

# 静的ファイル配信（本番環境用）
STATIC_DIR = Path(__file__).parent.parent / "static"
if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").is_file():
    app.mount(
        "/assets",
        StaticFiles(directory=STATIC_DIR / "assets"),
        name="assets",
    )

    # SPA fallback: APIでない全ルートを index.html に返す
    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        index = STATIC_DIR / "index.html"
        return FileResponse(index)
