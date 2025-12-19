"""FastAPI service powering the Tappy journal planner/executor pipeline."""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import init_db, get_session
from .models import JournalEntry, InboxItem
from .schemas import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryListItem,
    JournalCreateResponse,
    InboxItemCreate,
    InboxItemUpdate,
    InboxItemResponse,
    PlannerAction,
    PlannerResult,
    BrowserUseResult,
)

try:
    from google import genai
    from google.genai import types
except Exception as exc:
    raise RuntimeError(
        "Google GenAI SDK is required. Install dependencies with `uv sync`."
    ) from exc


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


def _get_allowed_origins() -> List[str]:
    origin = os.getenv("WEB_ORIGIN", "http://localhost:3000")
    # Allow common dev ports
    return [origin, "http://localhost:3000", "http://localhost:3001"]


def _get_genai_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")
    return genai.Client(api_key=api_key)


def _planner_prompt(text: str) -> str:
    return (
        "You are an action planner for a browser agent. "
        "Read the journal entry and decide if a browser automation action is required. "
        "Respond strictly with a JSON object matching this schema: "
        "{\"should_act\": boolean, \"action\": {\"type\": string, \"task\": string, \"skills\": string[]} | null}. "
        "If an action is needed, set should_act to true and action.type to 'browser_use'. "
        "Populate action.task with a concise objective. "
        "Populate action.skills with placeholder UUID strings (e.g., 'REPLACE_ME_SKILL_UUID_1', 'REPLACE_ME_SKILL_UUID_2') that should be replaced later. "
        "If no action is needed, set should_act to false and action to null. "
        "Do not include any additional keys, prose, or markdown—only output JSON.\n\n"
        f"Journal entry: {text}"
    )


def _extract_response_text(response: Any) -> str:
    """Best-effort extraction of JSON text from the SDK response."""
    if hasattr(response, "text") and response.text:
        return response.text
    try:
        return response.candidates[0].content.parts[0].text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to parse planner output: {exc}")


def _parse_plan(raw_text: str) -> PlannerResult:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Planner returned invalid JSON: {exc}")
    return PlannerResult.model_validate(payload)


async def _execute_browser_action(action: PlannerAction) -> BrowserUseResult:
    """Invoke the Browser Use agent when planning requests it."""
    try:
        from browser_use import Agent, ChatBrowserUse
        from browser_use.browser import Browser, BrowserConfig
    except Exception as exc:
        return BrowserUseResult(
            status="skipped",
            reason="browser-use is not installed. Run `uvx browser-use install` to enable execution.",
            detail=str(exc),
        )

    api_key = os.getenv("BROWSER_USE_API_KEY")
    browser_config = {"headless": True}
    if api_key:
        browser_config["api_key"] = api_key
        browser_config.setdefault("use_cloud", True)

    try:
        browser = Browser(config=BrowserConfig(**browser_config))
        llm = ChatBrowserUse()
        agent = Agent(task=action.task, browser=browser, llm=llm, skills=action.skills)
        result = await agent.run(max_steps=1)
    except Exception as exc:
        return BrowserUseResult(status="failed", reason=str(exc))

    if hasattr(result, "model_dump"):
        return BrowserUseResult(status="completed", output=result.model_dump())

    return BrowserUseResult(status="completed", output=str(result))


async def _plan_action(text: str) -> PlannerResult:
    client = _get_genai_client()
    response = client.models.generate_content(
        model=os.getenv("GENAI_MODEL", "gemini-1.5-flash"),
        contents=[_planner_prompt(text)],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    raw_text = _extract_response_text(response)
    return _parse_plan(raw_text)


def _extract_title_from_content(content_json: str) -> Optional[str]:
    """Extract title from first header block in Editor.js content."""
    try:
        content = json.loads(content_json)
        for block in content.get("blocks", []):
            if block.get("type") == "header" and block.get("data", {}).get("text"):
                return block["data"]["text"][:255]
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return None


def _get_preview(text: str, max_length: int = 150) -> str:
    """Get a preview of the text, truncated to max_length."""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


app = FastAPI(title="Tappy Journal API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


# ============== Journal Entry Routes ==============

@app.get("/journal", response_model=List[JournalEntryListItem])
async def list_journal_entries(
    session: AsyncSession = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
) -> List[JournalEntryListItem]:
    """List all journal entries, newest first."""
    # Get entries with action count
    stmt = (
        select(
            JournalEntry,
            func.count(InboxItem.id).label("actions_triggered")
        )
        .outerjoin(InboxItem)
        .group_by(JournalEntry.id)
        .order_by(JournalEntry.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.all()

    return [
        JournalEntryListItem(
            id=entry.id,
            title=entry.title,
            preview=_get_preview(entry.text),
            created_at=entry.created_at,
            actions_triggered=actions_count,
        )
        for entry, actions_count in rows
    ]


@app.get("/journal/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: int,
    session: AsyncSession = Depends(get_session),
) -> JournalEntryResponse:
    """Get a single journal entry by ID."""
    stmt = (
        select(
            JournalEntry,
            func.count(InboxItem.id).label("actions_triggered")
        )
        .outerjoin(InboxItem)
        .where(JournalEntry.id == entry_id)
        .group_by(JournalEntry.id)
    )
    result = await session.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    entry, actions_count = row
    return JournalEntryResponse(
        id=entry.id,
        title=entry.title,
        text=entry.text,
        content_json=entry.content_json,
        created_at=entry.created_at,
        actions_triggered=actions_count,
    )


@app.post("/journal", response_model=JournalCreateResponse)
async def create_journal_entry(
    payload: JournalEntryCreate,
    session: AsyncSession = Depends(get_session),
) -> JournalCreateResponse:
    """Create a new journal entry, analyze it, and optionally create inbox items."""
    # Use explicit title if provided, otherwise extract from content
    title = payload.title or _extract_title_from_content(payload.content_json)

    # Create the journal entry
    entry = JournalEntry(
        title=title,
        text=payload.text,
        content_json=payload.content_json,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)

    # Run the planner (optional - don't fail if API key missing)
    plan = None
    execution = None
    inbox_item_response = None

    try:
        plan = await _plan_action(payload.text)
    except Exception as e:
        # Log but don't fail - entry is already saved
        print(f"Planner failed (entry still saved): {e}")
        plan = PlannerResult(should_act=False, action=None)

    if plan.should_act and plan.action:
        execution = await _execute_browser_action(plan.action)

        # Create inbox item for the action
        inbox_item = InboxItem(
            journal_entry_id=entry.id,
            title=f"Action: {plan.action.task[:50]}",
            message=plan.action.task,
            action="View details",
            status="needs_confirmation" if execution.status == "completed" else "pending",
            journal_excerpt=payload.text[:200] if len(payload.text) > 200 else payload.text,
        )
        session.add(inbox_item)
        await session.commit()
        await session.refresh(inbox_item)

        inbox_item_response = InboxItemResponse(
            id=inbox_item.id,
            title=inbox_item.title,
            message=inbox_item.message,
            action=inbox_item.action,
            status=inbox_item.status,
            journal_entry_id=inbox_item.journal_entry_id,
            journal_excerpt=inbox_item.journal_excerpt,
            created_at=inbox_item.created_at,
        )

    entry_response = JournalEntryResponse(
        id=entry.id,
        title=entry.title,
        text=entry.text,
        content_json=entry.content_json,
        created_at=entry.created_at,
        actions_triggered=1 if inbox_item_response else 0,
    )

    return JournalCreateResponse(
        entry=entry_response,
        plan=plan,
        execution=execution,
        inbox_item=inbox_item_response,
    )


@app.delete("/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Delete a journal entry."""
    stmt = select(JournalEntry).where(JournalEntry.id == entry_id)
    result = await session.execute(stmt)
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    await session.delete(entry)
    await session.commit()

    return {"status": "deleted"}


# ============== Inbox Routes ==============

@app.get("/inbox", response_model=List[InboxItemResponse])
async def list_inbox_items(
    session: AsyncSession = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
) -> List[InboxItemResponse]:
    """List all inbox items, newest first."""
    stmt = (
        select(InboxItem)
        .order_by(InboxItem.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    items = result.scalars().all()

    return [
        InboxItemResponse(
            id=item.id,
            title=item.title,
            message=item.message,
            action=item.action,
            status=item.status,
            journal_entry_id=item.journal_entry_id,
            journal_excerpt=item.journal_excerpt,
            created_at=item.created_at,
        )
        for item in items
    ]


@app.get("/inbox/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    item_id: int,
    session: AsyncSession = Depends(get_session),
) -> InboxItemResponse:
    """Get a single inbox item by ID."""
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        action=item.action,
        status=item.status,
        journal_entry_id=item.journal_entry_id,
        journal_excerpt=item.journal_excerpt,
        created_at=item.created_at,
    )


@app.put("/inbox/{item_id}", response_model=InboxItemResponse)
async def update_inbox_item(
    item_id: int,
    payload: InboxItemUpdate,
    session: AsyncSession = Depends(get_session),
) -> InboxItemResponse:
    """Update an inbox item (e.g., change status)."""
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    # Update only provided fields
    if payload.status is not None:
        item.status = payload.status
    if payload.title is not None:
        item.title = payload.title
    if payload.message is not None:
        item.message = payload.message
    if payload.action is not None:
        item.action = payload.action

    await session.commit()
    await session.refresh(item)

    return InboxItemResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        action=item.action,
        status=item.status,
        journal_entry_id=item.journal_entry_id,
        journal_excerpt=item.journal_excerpt,
        created_at=item.created_at,
    )


@app.delete("/inbox/{item_id}")
async def delete_inbox_item(
    item_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Delete an inbox item."""
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    await session.delete(item)
    await session.commit()

    return {"status": "deleted"}
