"""Pydantic schemas for API request/response validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# Journal Entry Schemas
class JournalEntryCreate(BaseModel):
    """Request schema for creating a journal entry."""
    title: Optional[str] = Field(None, description="Optional explicit title for the entry")
    text: str = Field(..., description="Plain text version of the journal entry")
    content_json: str = Field(..., description="Full Editor.js JSON content")


class JournalEntryResponse(BaseModel):
    """Response schema for a journal entry."""
    id: int
    title: Optional[str] = None
    text: str
    content_json: str
    created_at: datetime
    actions_triggered: int = Field(default=0, description="Number of inbox items created from this entry")

    class Config:
        from_attributes = True


class JournalEntryListItem(BaseModel):
    """Simplified schema for listing journal entries."""
    id: int
    title: Optional[str] = None
    preview: str = Field(..., description="First ~150 chars of the text")
    created_at: datetime
    actions_triggered: int = 0

    class Config:
        from_attributes = True


# Inbox Item Schemas
class InboxItemCreate(BaseModel):
    """Request schema for creating an inbox item."""
    title: str
    message: str
    action: Optional[str] = None
    status: str = "pending"
    journal_entry_id: Optional[int] = None
    journal_excerpt: Optional[str] = None


class InboxItemUpdate(BaseModel):
    """Request schema for updating an inbox item."""
    status: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    action: Optional[str] = None


class InboxItemResponse(BaseModel):
    """Response schema for an inbox item."""
    id: int
    title: str
    message: str
    action: Optional[str] = None
    status: str
    journal_entry_id: Optional[int] = None
    journal_excerpt: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Planner/Execution Schemas (existing, moved here for organization)
class PlannerAction(BaseModel):
    """Action payload for the Browser Use agent."""
    type: str = Field(..., description="Action type. Use 'browser_use' for browser automation.")
    task: str = Field(..., description="Short task instruction for the Browser Use agent.")
    skills: List[str] = Field(
        ..., description="List of skill UUIDs available to the Browser Use agent."
    )


class PlannerResult(BaseModel):
    """Result from the planner analysis."""
    should_act: bool = Field(..., description="Whether the executor should run a browser action.")
    action: Optional[PlannerAction] = Field(
        None,
        description="Action payload for the Browser Use agent when should_act is true.",
    )


class BrowserUseResult(BaseModel):
    """Result from browser automation execution."""
    status: str
    reason: Optional[str] = None
    detail: Optional[str] = None
    output: Optional[Any] = None


# Combined Journal Response (for POST /journal)
class JournalCreateResponse(BaseModel):
    """Response schema for creating a journal entry with analysis."""
    entry: JournalEntryResponse
    plan: PlannerResult
    execution: Optional[BrowserUseResult] = None
    inbox_item: Optional[InboxItemResponse] = None
