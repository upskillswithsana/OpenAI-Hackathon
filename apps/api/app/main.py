from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, ai, ambassadors, auth, me, meetings
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if get_settings().auto_seed:
        from app.scripts.seed_demo import seed_demo_data

        seed_demo_data()
    yield


app = FastAPI(title=get_settings().app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(ambassadors.router)
app.include_router(me.router)
app.include_router(meetings.router)
app.include_router(admin.router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}



