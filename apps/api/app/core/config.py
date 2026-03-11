from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "UT AmbassadorAI API"
    app_env: str = "development"
    secret_key: str = "hackathon-secret"
    database_url: str = "sqlite:///./ambassador_ai.db"
    chroma_host: str | None = None
    chroma_port: int = 8001
    chroma_collection: str = "knowledge_chunks"
    chroma_persist_directory: Path = Field(default_factory=lambda: BASE_DIR / ".chroma")
    uploads_directory: Path = Field(default_factory=lambda: BASE_DIR / "uploads")
    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    auto_seed: bool = False
    default_timezone: str = "America/Chicago"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.chroma_persist_directory.mkdir(parents=True, exist_ok=True)
    settings.uploads_directory.mkdir(parents=True, exist_ok=True)
    return settings

