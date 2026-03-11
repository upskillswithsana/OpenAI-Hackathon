FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock alembic.ini ./
COPY alembic ./alembic
COPY app ./app

RUN uv sync --frozen

EXPOSE 8000

CMD ["sh", "-c", "rm -f ambassador_ai.db && uv run alembic upgrade head && uv run python -m app.scripts.seed_demo && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
