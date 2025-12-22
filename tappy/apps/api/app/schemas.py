"""Pydantic schemas for API request/response validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

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
    skill_result: Optional[Dict[str, Any]] = Field(None, description="Result from skill execution")

    class Config:
        from_attributes = True


# Planner Schemas - Generic for any skill
class SkillParameters(BaseModel):
    """Generic parameters for skill execution - can be extended per skill."""
    query: Optional[str] = Field(None, description="Generic query parameter")
    limit: Optional[int] = Field(None, description="Generic limit parameter")

    class Config:
        extra = "allow"  # Allow additional fields for skill-specific parameters


class PlannerResult(BaseModel):
    """Result from the planner analysis."""
    should_act: bool = Field(..., description="Whether any skill should be executed")
    skill_id: Optional[str] = Field(None, description="The skill UUID to execute")
    skill_name: Optional[str] = Field(None, description="Human-readable skill name")
    parameters: Optional[SkillParameters] = Field(None, description="Parameters for the skill")
    reason: str = Field(..., description="Why this decision was made")


class SkillExecutionResult(BaseModel):
    """Result from skill execution."""
    status: str  # "completed", "failed", "pending", "running"
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    skill_type: Optional[str] = None
    output: Optional[Any] = None
    error: Optional[str] = None
    formatted_output: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


