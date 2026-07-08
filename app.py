from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

BASE_DIR = Path(__file__).parent

app = FastAPI(title="APEX x DYNAMIC - Deal Tracker")


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        return response


app.add_middleware(NoCacheMiddleware)

app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")
