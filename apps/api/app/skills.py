"""
Modular skill system for Browser Use Cloud integration.

This module provides a registry-based architecture for managing different types of skills,
each with their own parameter schemas, execution logic, and result formatting.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Type, TYPE_CHECKING

from pydantic import BaseModel, Field

# Import to avoid circular dependency at runtime but allow type checking
if TYPE_CHECKING:
    from .schemas import SkillExecutionResult
else:
    # At runtime, import after schemas module is loaded
    def __getattr__(name):
        if name == "SkillExecutionResult":
            from .schemas import SkillExecutionResult as _SER
            globals()[name] = _SER
            return _SER
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


class SkillType(str, Enum):
    """Types of skills based on their behavior and output."""
    DATA_RETRIEVAL = "data_retrieval"  # Returns structured data (e.g., job search, news)
    ACTION = "action"  # Performs actions (e.g., send email, book appointment)
    ANALYSIS = "analysis"  # Returns text analysis (e.g., research, summarize)
    INTERACTIVE = "interactive"  # May have progress updates (e.g., browser automation)


class SkillStatus(str, Enum):
    """Status of skill execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# Base Parameter Schemas
class BaseSkillParameters(BaseModel):
    """Base class for skill-specific parameters."""
    pass


class JobSearchParameters(BaseSkillParameters):
    """Parameters for job search skill."""
    query: str = Field(..., description="Search query with optional filters (@company:name, @location:city)")
    limit: int = Field(default=10, ge=1, le=50, description="Max results to return")


class EmailParameters(BaseSkillParameters):
    """Parameters for email sending skill."""
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body")


class ResearchParameters(BaseSkillParameters):
    """Parameters for research/analysis skill."""
    topic: str = Field(..., description="Topic to research")
    depth: str = Field(default="medium", description="Research depth: quick, medium, or deep")


class HackerNewsParameters(BaseSkillParameters):
    """Parameters for HackerNews top posts skill."""
    limit: int = Field(default=10, ge=1, le=30, description="Number of top posts to fetch")


class WeatherParameters(BaseSkillParameters):
    """Parameters for weather forecast skill."""
    location: str = Field(..., description="City or location for weather forecast")
    days: int = Field(default=7, ge=1, le=7, description="Number of days to forecast")
    units: str = Field(default="e", description="Temperature units: 'e' for Fahrenheit, 'm' for Celsius")


class NewsSearchParameters(BaseSkillParameters):
    """Parameters for news search skill."""
    query: str = Field(..., description="Search query for news articles")
    max_results: int = Field(default=10, ge=1, le=20, description="Max articles to return")


# Note: SkillExecutionResult is imported from schemas.py to avoid duplication


# Formatted Result for Inbox
class FormattedSkillResult(BaseModel):
    """Formatted result ready for inbox item creation."""
    title: str = Field(..., description="Inbox item title")
    message: str = Field(..., description="Human-readable message")
    action: Optional[str] = Field(None, description="Call-to-action button text")
    status: str = Field(default="needs_confirmation", description="Initial inbox item status")


# Skill Configuration
class SkillConfig(BaseModel):
    """Configuration for a single skill."""
    id: str = Field(..., description="UUID of the skill")
    name: str = Field(..., description="Human-readable name")
    skill_type: SkillType
    description: str = Field(..., description="Description for planner")
    parameter_schema: Type[BaseSkillParameters] = Field(..., description="Pydantic model for parameters")
    example_params: Dict[str, Any] = Field(..., description="Example parameters for planner")
    planner_hints: str = Field(..., description="Hints for when to use this skill")

    class Config:
        arbitrary_types_allowed = True


class SkillHandler(ABC):
    """Abstract base class for skill handlers."""

    def __init__(self, config: SkillConfig):
        self.config = config

    @abstractmethod
    async def execute(self, parameters: BaseSkillParameters, api_key: str) -> "SkillExecutionResult":
        """Execute the skill with given parameters."""
        pass

    @abstractmethod
    def format_result(self, result: "SkillExecutionResult") -> FormattedSkillResult:
        """Format the execution result for display in inbox."""
        pass

    @abstractmethod
    def validate_output(self, output: Any) -> bool:
        """Validate the output structure from Browser Use API."""
        pass


class BrowserUseSkillHandler(SkillHandler):
    """Handler for Browser Use Cloud marketplace skills."""

    def __init__(self, config: SkillConfig, formatter: Optional[Callable] = None):
        super().__init__(config)
        self.formatter = formatter

    async def execute(self, parameters: BaseSkillParameters, api_key: str) -> "SkillExecutionResult":
        """Execute via Browser Use Cloud API."""
        import httpx
        import os
        import asyncio
        from .schemas import SkillExecutionResult

        url = f"{os.getenv('BROWSER_USE_API_URL', 'https://api.browser-use.com/api/v2')}/skills/{self.config.id}/execute"

        headers = {
            "Content-Type": "application/json",
            "X-Browser-Use-API-Key": api_key
        }

        # Convert parameters to dict
        params_dict = parameters.model_dump(exclude_none=True)

        payload = {
            "parameters": params_dict
        }

        try:
            # Use shorter timeout and better connection handling
            timeout = httpx.Timeout(30.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

                return SkillExecutionResult(
                    status=SkillStatus.COMPLETED.value,
                    skill_id=self.config.id,
                    skill_name=self.config.name,
                    skill_type=self.config.skill_type.value,
                    output=data,
                    metadata={"api_version": "v2"}
                )

        except asyncio.CancelledError:
            # Request was cancelled (likely timeout from FastAPI)
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error="Request cancelled (timeout or connection error). Browser Use API may be slow or unavailable."
            )

        except httpx.TimeoutException:
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error="Browser Use API request timed out after 30s"
            )

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error=error_msg
            )

        except Exception as e:
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error=f"{type(e).__name__}: {str(e)}"
            )

    def format_result(self, result: "SkillExecutionResult") -> FormattedSkillResult:
        """Format using custom formatter if provided, otherwise use default."""
        if self.formatter:
            return self.formatter(result)

        # Default formatting
        if result.status == SkillStatus.FAILED.value:
            return FormattedSkillResult(
                title=f"❌ {self.config.name} Failed",
                message=f"Error: {result.error}",
                status="pending"
            )

        return FormattedSkillResult(
            title=f"✅ {self.config.name} Completed",
            message=f"Result: {result.output}",
            action="View Details",
            status="needs_confirmation"
        )

    def validate_output(self, output: Any) -> bool:
        """Basic validation - can be overridden for specific skills."""
        return output is not None


# Skill Registry
class SkillRegistry:
    """Central registry for all available skills."""

    def __init__(self):
        self._skills: Dict[str, SkillHandler] = {}
        self._configs: Dict[str, SkillConfig] = {}

    def register(self, config: SkillConfig, handler: SkillHandler) -> None:
        """Register a new skill."""
        self._skills[config.id] = handler
        self._configs[config.id] = config

    def get_handler(self, skill_id: str) -> Optional[SkillHandler]:
        """Get handler for a skill."""
        return self._skills.get(skill_id)

    def get_config(self, skill_id: str) -> Optional[SkillConfig]:
        """Get configuration for a skill."""
        return self._configs.get(skill_id)

    def list_skills(self) -> List[SkillConfig]:
        """List all registered skills."""
        return list(self._configs.values())

    def get_planner_context(self) -> str:
        """Generate planner context from all registered skills."""
        if not self._configs:
            return "No skills available."

        context_parts = ["Available skills:"]
        for config in self._configs.values():
            context_parts.append(f"\n- {config.name} ({config.id}):")
            context_parts.append(f"  Type: {config.skill_type.value}")
            context_parts.append(f"  Description: {config.description}")
            context_parts.append(f"  When to use: {config.planner_hints}")
            context_parts.append(f"  Example parameters: {config.example_params}")

        return "\n".join(context_parts)


# Global registry instance
_global_registry = SkillRegistry()


def get_registry() -> SkillRegistry:
    """Get the global skill registry."""
    return _global_registry


def register_skill(config: SkillConfig, handler: SkillHandler) -> None:
    """Register a skill with the global registry."""
    _global_registry.register(config, handler)
