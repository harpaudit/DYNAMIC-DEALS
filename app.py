from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent

app = FastAPI(title="APEX x DYNAMIC - Deal Tracker")

app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")
