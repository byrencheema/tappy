"""FastAPI service powering the Tappy journal planner/executor pipeline."""

from __future__ import annotations

import json
import os
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    # Import early so startup fails loudly when the SDK is missing.
    from google import genai
    from google.genai import types
except Exception as exc:  # pragma: no cover - informs users during local setup
    raise RuntimeError(
        "Google GenAI SDK is required. Install dependencies with `uv sync`."
    ) from exc


class PlannerAction(BaseModel):
    type: str = Field(..., description="Action type. Use 'browser_use' for browser automation.")
    task: str = Field(..., description="Short task instruction for the Browser Use agent.")
    skills: List[str] = Field(
        ..., description="List of skill UUIDs available to the Browser Use agent."
    )


class PlannerResult(BaseModel):
    should_act: bool = Field(..., description="Whether the executor should run a browser action.")
    action: Optional[PlannerAction] = Field(
        None,
        description="Action payload for the Browser Use agent when should_act is true.",
    )


class JournalRequest(BaseModel):
    text: str = Field(..., description="User journal entry to analyze.")


class JournalResponse(BaseModel):
    plan: PlannerResult
    execution: Optional[BrowserUseResult] = None


class BrowserUseResult(BaseModel):
    status: str
    reason: Optional[str] = None
    detail: Optional[str] = None
    output: Optional[Any] = None


def _get_allowed_origins() -> List[str]:
    origin = os.getenv("WEB_ORIGIN", "http://localhost:3000")
    return [origin]


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
    # Fallback for SDK versions that expose candidates instead of .text
    try:
        return response.candidates[0].content.parts[0].text  # type: ignore[assignment]
    except Exception as exc:  # pragma: no cover - fallback path
        raise HTTPException(status_code=502, detail=f"Unable to parse planner output: {exc}")


def _parse_plan(raw_text: str) -> PlannerResult:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as exc:  # pragma: no cover - runtime validation
        raise HTTPException(status_code=502, detail=f"Planner returned invalid JSON: {exc}")
    return PlannerResult.model_validate(payload)


async def _execute_browser_action(action: PlannerAction) -> BrowserUseResult:
    """Invoke the Browser Use agent a single time when planning requests it."""
    try:
        from browser_use import Agent, ChatBrowserUse
        from browser_use.browser import Browser, BrowserConfig
    except Exception as exc:  # pragma: no cover - optional dependency path
        return BrowserUseResult(
            status="skipped",
            reason="browser-use is not installed. Run `uvx browser-use install` to enable execution.",
            detail=str(exc),
        )

    api_key = os.getenv("BROWSER_USE_API_KEY")
    browser_config = {"headless": True}
    if api_key:
        browser_config["api_key"] = api_key
        # Recommend Browser Use Cloud when an API key is present for better performance.
        browser_config.setdefault("use_cloud", True)

    try:
        browser = Browser(config=BrowserConfig(**browser_config))
        llm = ChatBrowserUse()
        agent = Agent(task=action.task, browser=browser, llm=llm, skills=action.skills)
        result = await agent.run(max_steps=1)
    except Exception as exc:  # pragma: no cover - runtime guardrails
        return BrowserUseResult(status="failed", reason=str(exc))

    if hasattr(result, "model_dump"):
        return BrowserUseResult(status="completed", output=result.model_dump())

    return BrowserUseResult(status="completed", output=str(result))


async def _plan_action(request: JournalRequest) -> PlannerResult:
    client = _get_genai_client()
    response = client.models.generate_content(
        model=os.getenv("GENAI_MODEL", "gemini-1.5-flash"),
        contents=[_planner_prompt(request.text)],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    raw_text = _extract_response_text(response)
    return _parse_plan(raw_text)


app = FastAPI(title="Tappy Journal API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/journal", response_model=JournalResponse)
async def journal_endpoint(payload: JournalRequest) -> JournalResponse:
    plan = await _plan_action(payload)

    if not plan.should_act or not plan.action:
        return JournalResponse(plan=plan, execution=None)

    execution = await _execute_browser_action(plan.action)
    return JournalResponse(plan=plan, execution=execution)


@app.get("/")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
