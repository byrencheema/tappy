# Tappy

**The world's first personal journal that takes action.**

Write about your life, and Tappy—your AI life assistant—makes things happen. Mention you want to lose weight? Tappy finds local 5K runs and gym deals. Planning an anniversary dinner? Tappy books the reservation. It reads between the lines of your journal entries and proactively helps with life's tasks.

## How it works

1. **Journal** — Write naturally about your day, thoughts, goals, or anything on your mind
2. **Tappy analyzes** — Our AI reads your entries and identifies actionable opportunities
3. **Actions go to Inbox** — Tappy sends you friendly notifications about what it found or did
4. **You confirm** — Approve actions that need your OK, or just let Tappy handle the rest

## Example

> *"Had a rough day at work. Really need to decompress this weekend. Sarah mentioned wanting to try that new Italian place downtown. Oh, and I keep forgetting to cancel that gym membership I never use..."*

Tappy might:
- Find availability at the Italian restaurant and offer to book a table
- Look up weekend wellness activities nearby
- Draft a gym cancellation request for your review

## Project Structure

```
apps/
├── web/     Next.js frontend (Bun, TypeScript, Tailwind)
└── api/     FastAPI backend (Python, Gemini, Browser Use)
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Editor.js
- **Backend**: FastAPI, Google Gemini for intent analysis, Browser Use for web automation
- **Styling**: Custom warm editorial design with Crimson Pro + Source Sans 3 fonts

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) for the web app
- [uv](https://github.com/astral-sh/uv) for Python dependencies
- Google Gemini API access

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Required variables:
- `GEMINI_API_KEY` — For AI intent analysis
- `BROWSER_USE_API_KEY` — For web automation (optional)
- `NEXT_PUBLIC_API_BASE_URL` — API endpoint (default: `http://localhost:8000`)

### Run the API

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Run the Web App

```bash
cd apps/web
bun install
bun dev
```

Visit `http://localhost:3000`

## Features

- **Rich text journal editor** — Notion-like writing experience with headers, lists, and formatting
- **Smart intent detection** — AI understands context and identifies opportunities to help
- **Inbox notifications** — Friendly messages from Tappy about actions taken or needing approval
- **Browser automation** — Tappy can search the web, fill forms, and complete tasks for you

## Roadmap

- [ ] User authentication
- [ ] Journal entry history
- [ ] More Browser Use skills (email, calendar, shopping)
- [ ] Mobile app
- [ ] Voice journal entries

---

Built with care by humans (and a helpful fox named Tappy)
