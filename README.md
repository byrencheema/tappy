# Tappy monorepo

A lightweight monorepo containing a Next.js web client and FastAPI backend for a journal-driven planner/executor flow that can hand tasks to a Browser Use agent.

## Structure
- `apps/web`: Next.js (App Router, TypeScript, Tailwind, shadcn/ui) powered by Bun.
- `apps/api`: FastAPI service orchestrating Gemini planning and optional Browser Use execution.

## Prerequisites
- [Bun](https://bun.sh/) for the web app.
- [uv](https://github.com/astral-sh/uv) for Python dependency management.
- Access to Google Gemini via the Google GenAI SDK.

## Environment
Create `.env` files from the provided examples:

```
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Variables you will need:
- `GEMINI_API_KEY`: Required for planner calls.
- `BROWSER_USE_API_KEY`: Optional key passed to Browser Use.
- `WEB_ORIGIN`: Origin allowed by API CORS (defaults to `http://localhost:3000`).
- `GENAI_MODEL`: Model name for planning (defaults to `gemini-1.5-flash`).
- `NEXT_PUBLIC_API_BASE_URL`: Base URL the web client calls (defaults to `http://localhost:8000`).

## Running the apps

### API (FastAPI + uv)
```
cd apps/api
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Optional: install the browser agent locally with `uvx browser-use install`. When `BROWSER_USE_API_KEY` is set, the executor enables Browser Use Cloud for better performance.

### Web (Next.js + Bun)
```
cd apps/web
bun install
bun run dev
```
Visit `http://localhost:3000` and ensure `NEXT_PUBLIC_API_BASE_URL` matches the API host/port.

## Notes
- The planner prompt enforces JSON-only responses and returns stub skill UUIDs for Browser Use. Replace them with real skill IDs when available.
- The executor runs a single Browser Use step when `should_act` is `true` and otherwise skips execution.
