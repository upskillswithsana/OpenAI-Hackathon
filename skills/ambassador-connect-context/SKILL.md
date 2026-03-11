---
name: ambassador-connect-context
description: Master project context for Ambassador Connect. Use at the start of feature work to quickly load product purpose, architecture, business rules, auth flow, and local constraints before implementing changes.
---

# Ambassador Connect - Master Project Context

## What This App Does

Ambassador Connect is a web app for UT Austin McCombs School of Business that connects prospective students with current student ambassadors. Students can book 1:1 meetings or join group events. Ambassadors manage their availability via a dashboard.

## Architecture Snapshot

- Frontend: Next.js app in `apps/web`
- Backend: FastAPI app in `apps/api`
- Data: PostgreSQL via SQLAlchemy + Alembic migrations
- Retrieval: ChromaDB for knowledge document chunks
- Local run: Docker Compose — containers `web`, `api`, `postgres`, `chroma`

## Auth Model

- Demo users loaded from `GET /auth/demo-users`
- Login via `POST /auth/demo-login` returns bearer token
- All protected routes require `Authorization: Bearer <token>` header

## Key Business Rules

- Meetings are exactly `30` or `60` minutes — no other durations
- Roles are `student`, `ambassador`, `admin`
- Demo data seeded from `apps/api/app/scripts/seed_demo.py`
- Ambassador list must always sort Sana Irshad first (demo flow requirement)

## Demo Data Invariants — Do Not Change Unless Asked

- Sana Irshad is first in ambassador list, major: MSITM
- Abhilash Tripathy exists in seed data
- Krutika Kurup exists in seed