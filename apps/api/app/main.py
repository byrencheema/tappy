"""FastAPI service powering the Tappy journal planner/executor pipeline."""

from __future__ import annotations

import json
import os
import httpx
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, List, Optional

from dotenv import load_dotenv

# Load .env file from the api directory
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .database import init_db, get_session, get_async_session_maker
from .models import JournalEntry, InboxItem
from .schemas import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryListItem,
    JournalCreateResponse,
    InboxItemUpdate,
    InboxItemResponse,
    PlannerResult,
    SkillParameters,
    SkillExecutionResult,
    AgenticStep,
)
from .skills import get_registry, SkillStatus
from . import skill_definitions  # Auto-registers skills

try:
    from google import genai
    from google.genai import types
except Exception as exc:
    raise RuntimeError(
        "Google GenAI SDK is required. Install dependencies with `uv sync`."
    ) from exc


# =============================================================================
# SKILL CONFIGURATION
# =============================================================================

# Skills are now configured in skill_definitions.py
# The registry auto-loads on import


# =============================================================================
# LIFESPAN & CONFIG
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


def _get_allowed_origins() -> List[str]:
    origin = os.getenv("WEB_ORIGIN", "http://localhost:3000")
    return [origin, "http://localhost:3000", "http://localhost:3001"]


def _get_genai_client() -> genai.Client:
    """Get Gemini client via Vertex AI with API Key authentication."""
    api_key = os.getenv("GOOGLE_CLOUD_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLOUD_API_KEY is not configured"
        )

    return genai.Client(vertexai=True, api_key=api_key)


# =============================================================================
# PLANNER - Detects when to execute skills
# =============================================================================

def _planner_prompt(text: str) -> str:
    """
    Generate planner prompt dynamically based on registered skills.
    The AI decides if the journal entry warrants any skill execution.
    """
    registry = get_registry()
    skills_context = registry.get_planner_context()

    # Get all skills for JSON schema examples
    skills = registry.list_skills()
    skill_examples = []
    for skill in skills:
        skill_examples.append(f'  - skill_id: "{skill.id}", skill_name: "{skill.name}"')

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
    """Best-effort extraction of JSON text from the SDK response."""
    if hasattr(response, "text") and response.text:
        return response.text
    try:
        return response.candidates[0].content.parts[0].text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to parse planner output: {exc}")


def _parse_plan(raw_text: str) -> PlannerResult:
    """Parse the planner's JSON response into a PlannerResult."""
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Planner returned invalid JSON: {exc}")
    
    # Handle parameters
    params = None
    if payload.get("parameters"):
        params = SkillParameters(**payload["parameters"])
    
    return PlannerResult(
        should_act=payload.get("should_act", False),
        skill_id=payload.get("skill_id"),
        skill_name=payload.get("skill_name"),
        parameters=params,
        reason=payload.get("reason", "No reason provided"),
    )


async def _plan_action(text: str) -> PlannerResult:
    """Run the planner to decide if we should execute a skill."""
    client = _get_genai_client()
    response = client.models.generate_content(
        model=os.getenv("GENAI_MODEL", "gemini-2.0-flash"),
        contents=[_planner_prompt(text)],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    raw_text = _extract_response_text(response)
    return _parse_plan(raw_text)


# =============================================================================
# SKILL EXECUTION - Registry-based
# =============================================================================

async def _execute_skill(skill_id: str, parameters: dict) -> SkillExecutionResult:
    """
    Execute a skill using the registry system.
    Supports any registered skill with its own parameter schema.
    """
    registry = get_registry()
    handler = registry.get_handler(skill_id)
    config = registry.get_config(skill_id)

    if not handler or not config:
        return SkillExecutionResult(
            status="failed",
            skill_id=skill_id,
            error=f"Skill {skill_id} is not registered"
        )

    # Check for test mode (skip actual API call)
    if os.getenv("SKILLS_TEST_MODE") == "true":
        print(f"[TEST MODE] Would execute skill {config.name} with params: {parameters}")
        from .skills import SkillStatus as SS
        return SkillExecutionResult(
            status=SS.COMPLETED.value,
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
            error="BROWSER_USE_API_KEY is not configured. Get one at https://cloud.browser-use.com"
        )

    try:
        # Parse parameters using skill's parameter schema
        param_instance = config.parameter_schema(**parameters)

        # Execute via handler
        print(f"Executing skill {config.name} with params: {parameters}")
        result = await handler.execute(param_instance, api_key)
        print(f"Skill execution result: status={result.status}")
        return result

    except Exception as exc:
        print(f"Skill execution error: {exc}")
        return SkillExecutionResult(
            status="failed",
            skill_id=skill_id,
            error=f"Execution error: {str(exc)}"
        )


# =============================================================================
# BACKGROUND PROCESSING
# =============================================================================

async def _process_journal_actions(
    entry_id: int,
    text: str,
    session_maker
) -> None:
    """
    Process journal actions in the background.
    This runs planner, executes skills, and creates inbox items without blocking the save.
    """
    async with session_maker() as session:
        try:
            # Step 1: Run planner
            print(f"[Background] Planning actions for journal entry {entry_id}")
            plan = await _plan_action(text)

            if not plan.should_act or not plan.skill_id or not plan.parameters:
                print(f"[Background] No action needed for entry {entry_id}: {plan.reason}")
                return

            # Step 2: Execute skill
            print(f"[Background] Executing skill {plan.skill_name} for entry {entry_id}")
            params_dict = plan.parameters.model_dump(exclude_none=True) if plan.parameters else {}
            execution = await _execute_skill(plan.skill_id, params_dict)

            if execution.status != SkillStatus.COMPLETED.value:
                print(f"[Background] Skill execution failed for entry {entry_id}: {execution.error}")
                return

            # Step 3: Format and create inbox item
            print(f"[Background] Creating inbox item for entry {entry_id}")
            registry = get_registry()
            handler = registry.get_handler(plan.skill_id)

            if handler:
                formatted = handler.format_result(execution)

                inbox_item = InboxItem(
                    journal_entry_id=entry_id,
                    title=formatted.title[:255],
                    message=formatted.message,
                    action=formatted.action,
                    status=formatted.status,
                    journal_excerpt=text[:200] if len(text) > 200 else text,
                )
                session.add(inbox_item)
                await session.commit()
                print(f"[Background] ✓ Created inbox item {inbox_item.id} for entry {entry_id}")

        except Exception as e:
            print(f"[Background] Error processing journal entry {entry_id}: {e}")
            # Don't raise - background tasks should fail silently


# =============================================================================
# HELPERS
# =============================================================================

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


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(title="Tappy Journal API", version="0.2.0", lifespan=lifespan)
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


@app.post("/journal", response_model=JournalEntryResponse)
async def create_journal_entry(
    payload: JournalEntryCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> JournalEntryResponse:
    """
    Create a new journal entry and return immediately.
    Actions are processed in the background.
    """
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

    # Schedule background processing
    session_maker = get_async_session_maker()
    background_tasks.add_task(
        _process_journal_actions,
        entry.id,
        payload.text,
        session_maker
    )

    # Return immediately - actions will process in background
    return JournalEntryResponse(
        id=entry.id,
        title=entry.title,
        text=entry.text,
        content_json=entry.content_json,
        created_at=entry.created_at,
        actions_triggered=0,  # Won't know yet - processing in background
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


@app.get("/inbox/recent", response_model=List[InboxItemResponse])
async def get_recent_inbox_items(
    since: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> List[InboxItemResponse]:
    """
    Get inbox items created after a specific timestamp.
    Used for polling to detect new actions.

    Args:
        since: ISO timestamp string (e.g., "2024-01-01T12:00:00")
               If not provided, returns all items from last 5 minutes
    """
    from datetime import datetime, timedelta

    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO format.")
    else:
        # Default: last 5 minutes
        since_dt = datetime.utcnow() - timedelta(minutes=5)

    stmt = (
        select(InboxItem)
        .where(InboxItem.created_at > since_dt)
        .order_by(InboxItem.created_at.desc())
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
