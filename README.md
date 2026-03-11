# UT AmbassadorAI

UT AmbassadorAI is a demo-first hackathon MVP that combines AI campus Q&A, ambassador recommendations, and structured booking between students and UT Austin ambassadors.
<img width="1234" height="765" alt="image" src="https://github.com/user-attachments/assets/a4065a38-7472-4f3c-8ad7-2544724016e5" />

## Workspace

- `apps/web`: Next.js + Tailwind frontend
- `apps/api`: FastAPI backend with SQLAlchemy, Alembic, and Chroma-backed retrieval
- `docker-compose.yml`: local Postgres and optional Chroma server

## Quick Start

1. Start infrastructure:

```bash
docker compose up -d
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
cd apps/api
uv sync
```

4. Copy environment examples:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

5. Apply migrations and seed demo data:

```bash
cd apps/api
uv run alembic upgrade head
uv run python -m app.scripts.seed_demo
```

6. Start both apps from the repo root:

```bash
npm run dev
```

## Demo Roles

The MVP uses demo login instead of real OAuth.

- `student` demo users can ask AI questions and book ambassadors.
- `ambassador` demo users can manage availability and confirm/decline requests.
- `admin` demo users can upload knowledge documents.

## Notable Defaults

- If `OPENAI_API_KEY` is not configured, the API falls back to deterministic local embeddings and answer generation so the demo still works.
- If `CHROMA_HOST` is not configured, embeddings are stored in a local persistent Chroma directory under `apps/api/.chroma`.
- Meeting links are generated only for confirmed virtual meetings and use a demo URL format.
