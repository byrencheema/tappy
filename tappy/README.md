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
- **Backend**: FastAPI, Google Gemini (Vertex AI), Browser Use for web automation
- **Database**: SQLite with SQLAlchemy async
- **Styling**: Custom warm terracotta/amber theme with Crimson Pro + Source Sans 3 fonts

## Current Status

- SQLite database integration for journal entries and inbox items
- Vertex AI with Gemini 2.0/3.0 Flash for intent analysis
- Auto-creation of inbox items when actions are detected in journal entries
- Full CRUD API for journal and inbox management
- Two-page UI: Journal (home) and Inbox

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) for the web app
- [uv](https://github.com/astral-sh/uv) for Python dependencies
- Google Cloud account with Vertex AI enabled (or Gemini API key)

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

#### API Environment Variables

For Vertex AI (recommended, uses Application Default Credentials):
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GENAI_MODEL=gemini-2.0-flash
```

Authenticate with:
```bash
gcloud auth application-default login
```

Alternative (API key):
- `GEMINI_API_KEY` — For AI intent analysis

For Browser Use skills:
- `BROWSER_USE_API_KEY` — API key from [cloud.browser-use.com](https://cloud.browser-use.com)
- `BROWSER_USE_PROFILE_ID` — Profile ID for authenticated actions (Gmail, X.com, etc.)

Optional:
- `WEB_ORIGIN` — CORS origin (default: `http://localhost:3000`)

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

## Skills

Tappy uses [Browser Use](https://browser-use.com) to automate real browser actions. Current skills:

| Skill | Type | Description |
|-------|------|-------------|
| Tech Job Search | data | Search for tech jobs |
| HackerNews Top Posts | data | Fetch top HN posts |
| Weather Forecast | data | Get weather forecast |
| News Search | data | Search news articles |
| YouTube Search | data | Search YouTube videos |
| X.com Post Maker | action | Post tweets |
| Google Calendar | action | Create calendar events |
| Amazon Add to Cart | action | Add items to Amazon cart |
| Save Gmail Draft | action | Save email drafts in Gmail |

See `apps/api/SKILLS.md` for details on adding new skills.

## Features

- **Rich text journal editor** — Notion-like writing experience with headers, lists, and formatting
- **Smart intent detection** — Gemini AI analyzes entries and identifies actionable opportunities
- **Inbox notifications** — Friendly messages from Tappy about actions taken or needing approval
- **Persistent storage** — All journal entries and inbox items saved to SQLite
- **9 Browser Use skills** — Tappy can search the web, post tweets, create calendar events, and more

## API Endpoints

### Journal
- `GET /journal` — List all journal entries
- `GET /journal/{id}` — Get a single entry
- `POST /journal` — Create entry (triggers AI analysis)
- `DELETE /journal/{id}` — Delete entry

### Inbox
- `GET /inbox` — List all inbox items
- `GET /inbox/{id}` — Get a single item
- `PUT /inbox/{id}` — Update item (e.g., change status)
- `DELETE /inbox/{id}` — Delete item

## Roadmap

- [ ] User authentication
- [x] Browser Use skills (email, calendar, shopping)
- [ ] Mobile app
- [ ] Voice journal entries

---

Built with care by humans (and a helpful fox named Tappy)
