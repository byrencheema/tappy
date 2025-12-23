"""FastAPI service powering the Tappy journal planner/executor pipeline."""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .database import init_db, get_session, async_session_maker
from .models import JournalEntry, InboxItem
from .schemas import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryListItem,
    InboxItemUpdate,
    InboxItemResponse,
    PlannerResult,
    SkillParameters,
    SkillExecutionResult,
)
from .skills import get_registry, SkillStatus
from . import skill_definitions

try:
    from google import genai
    from google.genai import types
except Exception as exc:
    raise RuntimeError(
        "Google GenAI SDK is required. Install dependencies with `uv sync`."
    ) from exc


job_queue: asyncio.Queue[Tuple[int, str]] = asyncio.Queue()

sse_clients: list[asyncio.Queue] = []


async def broadcast_inbox_item(item_data: dict) -> None:
    """Broadcast a new inbox item to all connected SSE clients."""
    message = json.dumps(item_data)
    for queue in sse_clients:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            pass


async def _queue_worker() -> None:
    """Process journal entries one at a time to avoid rate limits."""
    while True:
        entry_id, text = await job_queue.get()
        try:
            await _process_entry_background(entry_id, text)
        except Exception as e:
            print(f"[Queue] Error processing entry {entry_id}: {e}")
        finally:
            job_queue.task_done()
            await asyncio.sleep(0.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    worker_task = asyncio.create_task(_queue_worker())
    print("✓ Job queue worker started")
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


def _get_allowed_origins() -> List[str]:
    origin = os.getenv("WEB_ORIGIN", "http://localhost:3000")
    return [origin, "http://localhost:3000", "http://localhost:3001"]


def _get_genai_client() -> genai.Client:
    api_key = os.getenv("GOOGLE_CLOUD_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_CLOUD_API_KEY is not configured")
    return genai.Client(vertexai=True, api_key=api_key)


def _planner_prompt(text: str) -> str:
    registry = get_registry()
    skills_context = registry.get_planner_context()
    skills = registry.list_skills()
    skill_examples = [f'  - skill_id: "{s.id}", skill_name: "{s.name}"' for s in skills]

    return f"""You are Tappy, a helpful journal assistant that can take actions for users.

{skills_context}

Your task: Analyze the journal entry and decide if any skill should be executed.

IMPORTANT RULES:
- Only trigger a skill if the user clearly expresses intent related to that skill
- Regular mentions or complaints don't warrant action
- Extract specific parameters from the journal text when possible
- Be conservative - when in doubt, don't act

Respond with JSON only:
{{
  "should_act": true or false,
  "skill_id": "skill-uuid" or null,
  "skill_name": "skill_name" or null,
  "parameters": {{parameter_object}} or null,
  "reason": "Brief explanation of your decision"
}}

Available skill IDs:
{chr(10).join(skill_examples)}

Journal entry:
{text}"""


def _extract_response_text(response: Any) -> str:
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

    if isinstance(payload, list):
        payload = payload[0] if payload else {}

    params = SkillParameters(**payload["parameters"]) if payload.get("parameters") else None

    return PlannerResult(
        should_act=payload.get("should_act", False),
        skill_id=payload.get("skill_id"),
        skill_name=payload.get("skill_name"),
        parameters=params,
        reason=payload.get("reason", "No reason provided"),
    )


async def _plan_action(text: str) -> PlannerResult:
    client = _get_genai_client()
    response = client.models.generate_content(
        model=os.getenv("GENAI_MODEL", "gemini-2.0-flash"),
        contents=[_planner_prompt(text)],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return _parse_plan(_extract_response_text(response))


async def _execute_skill(skill_id: str, parameters: dict) -> SkillExecutionResult:
    registry = get_registry()
    handler = registry.get_handler(skill_id)
    config = registry.get_config(skill_id)

    if not handler or not config:
        return SkillExecutionResult(status="failed", skill_id=skill_id, error=f"Skill {skill_id} is not registered")

    if os.getenv("SKILLS_TEST_MODE") == "true":
        print(f"[TEST MODE] Would execute skill {config.name} with params: {parameters}")
        return SkillExecutionResult(
            status=SkillStatus.COMPLETED.value,
            skill_id=skill_id,
            skill_name=config.name,
            skill_type=config.skill_type.value,
            output={
                "result": {
                    "data": {
                        "jobs": [
                            {"title": "Test ML Engineer", "company": "Test Corp", "location": "San Francisco", "salary_summary": "$150k-$200k"},
                            {"title": "Test AI Researcher", "company": "Test AI", "location": "Remote", "salary_summary": "$180k-$220k"}
                        ],
                        "count": 2
                    }
                }
            },
            metadata={"test_mode": True}
        )

    api_key = os.getenv("BROWSER_USE_API_KEY")
    if not api_key:
        return SkillExecutionResult(
            status="failed",
            skill_id=skill_id,
            error="BROWSER_USE_API_KEY is not configured"
        )

    try:
        param_instance = config.parameter_schema(**parameters)
        print(f"Executing skill {config.name} with params: {parameters}")
        result = await handler.execute(param_instance, api_key)
        print(f"Skill execution result: status={result.status}")
        return result
    except Exception as exc:
        print(f"Skill execution error: {exc}")
        return SkillExecutionResult(status="failed", skill_id=skill_id, error=f"Execution error: {str(exc)}")


async def _process_entry_background(entry_id: int, text: str) -> None:
    async with async_session_maker() as session:
        try:
            plan = await _plan_action(text)

            if not plan.should_act or not plan.skill_id or not plan.parameters:
                print(f"[Queue] Entry {entry_id}: No action needed - {plan.reason}")
                return

            params_dict = plan.parameters.model_dump(exclude_none=True)
            print(f"[Queue] Entry {entry_id}: Executing {plan.skill_name}")
            execution = await _execute_skill(plan.skill_id, params_dict)

            if execution.status != SkillStatus.COMPLETED.value:
                print(f"[Queue] Entry {entry_id}: Skill failed - {execution.error}")
                return

            handler = get_registry().get_handler(plan.skill_id)
            if handler:
                formatted = handler.format_result(execution)
                skill_result = {
                    "links": [link.model_dump() for link in formatted.links]
                } if formatted.links else None
                inbox_item = InboxItem(
                    journal_entry_id=entry_id,
                    title=formatted.title[:255],
                    message=formatted.message,
                    journal_excerpt=text[:200] if len(text) > 200 else text,
                    skill_result=skill_result,
                )
                session.add(inbox_item)
                await session.commit()
                await session.refresh(inbox_item)
                print(f"[Queue] Entry {entry_id}: Created inbox item '{formatted.title}'")

                await broadcast_inbox_item({
                    "id": inbox_item.id,
                    "title": inbox_item.title,
                    "message": inbox_item.message,
                    "journal_entry_id": inbox_item.journal_entry_id,
                    "journal_excerpt": inbox_item.journal_excerpt,
                    "created_at": inbox_item.created_at.isoformat() + "Z",
                    "is_read": inbox_item.is_read,
                    "skill_result": inbox_item.skill_result,
                })
        except Exception as e:
            print(f"[Queue] Entry {entry_id}: Error - {e}")


def _extract_title_from_content(content_json: str) -> Optional[str]:
    try:
        content = json.loads(content_json)
        for block in content.get("blocks", []):
            if block.get("type") == "header" and block.get("data", {}).get("text"):
                return block["data"]["text"][:255]
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return None


def _get_preview(text: str, max_length: int = 150) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


app = FastAPI(title="Tappy Journal API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/journal", response_model=List[JournalEntryListItem])
async def list_journal_entries(
    session: AsyncSession = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
) -> List[JournalEntryListItem]:
    stmt = (
        select(JournalEntry, func.count(InboxItem.id).label("actions_triggered"))
        .outerjoin(InboxItem)
        .group_by(JournalEntry.id)
        .order_by(JournalEntry.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [
        JournalEntryListItem(
            id=entry.id,
            title=entry.title,
            preview=_get_preview(entry.text),
            created_at=entry.created_at,
            actions_triggered=actions_count,
        )
        for entry, actions_count in result.all()
    ]


@app.get("/journal/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: int,
    session: AsyncSession = Depends(get_session),
) -> JournalEntryResponse:
    stmt = (
        select(JournalEntry, func.count(InboxItem.id).label("actions_triggered"))
        .outerjoin(InboxItem)
        .where(JournalEntry.id == entry_id)
        .group_by(JournalEntry.id)
    )
    row = (await session.execute(stmt)).first()
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


@app.post("/journal", response_model=JournalEntryResponse)
async def create_journal_entry(
    payload: JournalEntryCreate,
    session: AsyncSession = Depends(get_session),
) -> JournalEntryResponse:
    title = payload.title or _extract_title_from_content(payload.content_json)
    entry = JournalEntry(title=title, text=payload.text, content_json=payload.content_json)
    session.add(entry)
    await session.commit()
    await session.refresh(entry)

    await job_queue.put((entry.id, payload.text))

    return JournalEntryResponse(
        id=entry.id,
        title=entry.title,
        text=entry.text,
        content_json=entry.content_json,
        created_at=entry.created_at,
        actions_triggered=0,
    )


@app.delete("/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    stmt = select(JournalEntry).where(JournalEntry.id == entry_id)
    entry = (await session.execute(stmt)).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    await session.delete(entry)
    await session.commit()
    return {"status": "deleted"}


@app.get("/inbox", response_model=List[InboxItemResponse])
async def list_inbox_items(
    session: AsyncSession = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
) -> List[InboxItemResponse]:
    stmt = select(InboxItem).order_by(InboxItem.created_at.desc()).offset(offset).limit(limit)
    items = (await session.execute(stmt)).scalars().all()
    return [
        InboxItemResponse(
            id=item.id,
            title=item.title,
            message=item.message,
            journal_entry_id=item.journal_entry_id,
            journal_excerpt=item.journal_excerpt,
            created_at=item.created_at,
            is_read=item.is_read,
        )
        for item in items
    ]


@app.get("/inbox/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    item_id: int,
    session: AsyncSession = Depends(get_session),
) -> InboxItemResponse:
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        journal_entry_id=item.journal_entry_id,
        journal_excerpt=item.journal_excerpt,
        created_at=item.created_at,
        is_read=item.is_read,
    )


@app.put("/inbox/{item_id}", response_model=InboxItemResponse)
async def update_inbox_item(
    item_id: int,
    payload: InboxItemUpdate,
    session: AsyncSession = Depends(get_session),
) -> InboxItemResponse:
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    if payload.title is not None:
        item.title = payload.title
    if payload.message is not None:
        item.message = payload.message

    await session.commit()
    await session.refresh(item)

    return InboxItemResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        journal_entry_id=item.journal_entry_id,
        journal_excerpt=item.journal_excerpt,
        created_at=item.created_at,
        is_read=item.is_read,
    )


@app.delete("/inbox/{item_id}")
async def delete_inbox_item(
    item_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    await session.delete(item)
    await session.commit()
    return {"status": "deleted"}


@app.patch("/inbox/{item_id}/read", response_model=InboxItemResponse)
async def mark_inbox_item_read(
    item_id: int,
    session: AsyncSession = Depends(get_session),
) -> InboxItemResponse:
    stmt = select(InboxItem).where(InboxItem.id == item_id)
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    item.is_read = True
    await session.commit()
    await session.refresh(item)

    return InboxItemResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        journal_entry_id=item.journal_entry_id,
        journal_excerpt=item.journal_excerpt,
        created_at=item.created_at,
        is_read=item.is_read,
    )


async def _sse_generator(queue: asyncio.Queue):
    """Generate SSE events from a queue."""
    try:
        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"event: inbox-item\ndata: {message}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    except asyncio.CancelledError:
        pass


@app.get("/events")
async def sse_events():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    sse_clients.append(queue)

    async def cleanup_generator():
        try:
            async for event in _sse_generator(queue):
                yield event
        finally:
            if queue in sse_clients:
                sse_clients.remove(queue)

    return StreamingResponse(
        cleanup_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
