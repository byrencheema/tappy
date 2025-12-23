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
    DATA_RETRIEVAL = "data_retrieval"  # Returns structured data (e.g., job search, weather)
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


class XPostParameters(BaseSkillParameters):
    """Parameters for X.com (Twitter) post skill."""
    content: str = Field(..., description="The text content to post", max_length=280)


class GoogleCalendarParameters(BaseSkillParameters):
    """Parameters for Google Calendar event creation skill."""
    title: str = Field(..., description="Event title")
    date: str = Field(..., description="Event date in YYYY-MM-DD format")
    time: str = Field(..., description="Event start time in HH:MM format (24-hour)")
    description: Optional[str] = Field(None, description="Event description")
    location: Optional[str] = Field(None, description="Event location")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="Event duration in minutes")


class YouTubeSearchParameters(BaseSkillParameters):
    """Parameters for YouTube search skill."""
    query: str = Field(..., description="Search query for YouTube videos")
    max_results: int = Field(default=10, ge=1, le=20, description="Max videos to return")


class AmazonAddToCartParameters(BaseSkillParameters):
    """Parameters for Amazon add to cart skill."""
    product_query: str = Field(..., description="Product search query")
    quantity: int = Field(default=1, ge=1, le=10, description="Quantity to add to cart")


# Note: SkillExecutionResult is imported from schemas.py to avoid duplication


# Formatted Result for Inbox
class FormattedSkillResult(BaseModel):
    """Formatted result ready for inbox item creation."""
    title: str = Field(..., description="Inbox item title")
    message: str = Field(..., description="Human-readable message")


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
    async def execute(self, parameters: BaseSkillParameters, api_key: str, profile_id: Optional[str] = None) -> "SkillExecutionResult":
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

    async def execute(self, parameters: BaseSkillParameters, api_key: str, profile_id: Optional[str] = None) -> "SkillExecutionResult":
        """Execute via Browser Use Cloud API."""
        import httpx
        import os
        import asyncio
        from .schemas import SkillExecutionResult

        base_url = os.getenv('BROWSER_USE_API_URL', 'https://api.browser-use.com/api/v2')
        headers = {
            "Content-Type": "application/json",
            "X-Browser-Use-API-Key": api_key
        }

        params_dict = parameters.model_dump(exclude_none=True)

        # For ACTION skills, use session+task approach for cookie-based auth
        if self.config.skill_type == SkillType.ACTION:
            return await self._execute_via_session(
                base_url=base_url,
                headers=headers,
                parameters=params_dict,
                profile_id=profile_id or os.getenv("BROWSER_USE_PROFILE_ID"),
                api_key=api_key
            )

        # For data retrieval skills, use direct skill execution
        url = f"{base_url}/skills/{self.config.id}/execute"
        payload = {"parameters": params_dict}

        try:
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

    async def _execute_via_session(
        self,
        base_url: str,
        headers: Dict[str, str],
        parameters: Dict[str, Any],
        profile_id: Optional[str],
        api_key: str
    ) -> "SkillExecutionResult":
        """
        Execute ACTION skills via session+task for cookie-based authentication.

        Why this approach?
        - ACTION skills (posting tweets, sending emails, etc.) need authentication
        - Browser Use profiles store cookies from logged-in sessions
        - Direct skill execution requires passing cookies as parameters
        - Session+Task approach auto-injects cookies from the profile

        Flow:
        1. Create session with profile (cookies injected into browser)
        2. Create task with skill reference + description
        3. Poll until task completes (~30-40 seconds)
        4. Clean up session
        """
        import httpx
        import asyncio
        from .schemas import SkillExecutionResult

        if not profile_id:
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error="Profile ID required for authenticated action skills"
            )

        session_id = None
        timeout = httpx.Timeout(180.0, connect=10.0)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Create session with profile
                session_resp = await client.post(
                    f"{base_url}/sessions",
                    json={"profileId": profile_id},
                    headers=headers
                )
                if session_resp.status_code not in [200, 201]:
                    return SkillExecutionResult(
                        status=SkillStatus.FAILED.value,
                        skill_id=self.config.id,
                        skill_name=self.config.name,
                        skill_type=self.config.skill_type.value,
                        error=f"Failed to create session: {session_resp.text}"
                    )

                session_data = session_resp.json()
                session_id = session_data.get("id")

                # Build task description from parameters
                task_description = self._build_task_description(parameters)

                # Create task with skill
                task_resp = await client.post(
                    f"{base_url}/tasks",
                    json={
                        "sessionId": session_id,
                        "skills": [self.config.id],
                        "task": task_description
                    },
                    headers=headers
                )

                if task_resp.status_code not in [200, 201, 202]:
                    await client.delete(f"{base_url}/sessions/{session_id}", headers=headers)
                    return SkillExecutionResult(
                        status=SkillStatus.FAILED.value,
                        skill_id=self.config.id,
                        skill_name=self.config.name,
                        skill_type=self.config.skill_type.value,
                        error=f"Failed to create task: {task_resp.text}"
                    )

                task_data = task_resp.json()
                task_id = task_data.get("id")

                # Poll for completion (max 5 minutes - Gmail can take 4+ min)
                for _ in range(100):
                    await asyncio.sleep(3)
                    status_resp = await client.get(
                        f"{base_url}/tasks/{task_id}",
                        headers=headers
                    )
                    status_data = status_resp.json()
                    status = status_data.get("status")

                    if status in ["finished", "failed", "stopped"]:
                        await client.delete(f"{base_url}/sessions/{session_id}", headers=headers)

                        if status == "finished" and status_data.get("isSuccess"):
                            return SkillExecutionResult(
                                status=SkillStatus.COMPLETED.value,
                                skill_id=self.config.id,
                                skill_name=self.config.name,
                                skill_type=self.config.skill_type.value,
                                output={
                                    "result": {
                                        "success": True,
                                        "data": {
                                            "content": parameters.get("content") or parameters.get("message"),
                                            "output": status_data.get("output")
                                        }
                                    }
                                },
                                metadata={"task_id": task_id, "steps": len(status_data.get("steps", []))}
                            )
                        else:
                            return SkillExecutionResult(
                                status=SkillStatus.FAILED.value,
                                skill_id=self.config.id,
                                skill_name=self.config.name,
                                skill_type=self.config.skill_type.value,
                                error=status_data.get("output", f"Task {status}")
                            )

                # Timeout
                await client.delete(f"{base_url}/sessions/{session_id}", headers=headers)
                return SkillExecutionResult(
                    status=SkillStatus.FAILED.value,
                    skill_id=self.config.id,
                    skill_name=self.config.name,
                    skill_type=self.config.skill_type.value,
                    error="Task execution timed out after 2 minutes"
                )

        except Exception as e:
            if session_id:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.delete(f"{base_url}/sessions/{session_id}", headers=headers)
                except:
                    pass
            return SkillExecutionResult(
                status=SkillStatus.FAILED.value,
                skill_id=self.config.id,
                skill_name=self.config.name,
                skill_type=self.config.skill_type.value,
                error=f"{type(e).__name__}: {str(e)}"
            )

    def _build_task_description(self, parameters: Dict[str, Any]) -> str:
        """
        Build a natural language task description for the AI agent.

        TO ADD A NEW ACTION SKILL:
        1. Create the skill on cloud.browser-use.com
        2. Add parameter schema in this file (e.g., LinkedInPostParameters)
        3. Add config + handler in skill_definitions.py with SkillType.ACTION
        4. Add a case here to build the task description

        The description should be clear instructions for what the agent should do.
        """
        # X.com / Twitter posting
        if self.config.name == "X.com Post Maker":
            content = parameters.get("content") or parameters.get("message", "")
            return f'Post a tweet saying: {content}'

        # Google Calendar event creation
        if self.config.name == "Google Calendar":
            title = parameters.get("title", "")
            date = parameters.get("date", "")
            time = parameters.get("time", "")
            description = parameters.get("description", "")
            location = parameters.get("location", "")
            duration = parameters.get("duration_minutes", 60)

            task = f'Create a calendar event titled "{title}" on {date} at {time} for {duration} minutes'
            if description:
                task += f' with description: {description}'
            if location:
                task += f' at location: {location}'
            return task

        # Amazon Add to Cart
        if self.config.name == "Amazon Add to Cart":
            product_query = parameters.get("product_query", "")
            quantity = parameters.get("quantity", 1)
            return f'Search for "{product_query}" on Amazon and add {quantity} to the cart'

        # Save Gmail Draft
        if self.config.name == "Save Gmail Draft":
            to = parameters.get("to", "")
            subject = parameters.get("subject", "")
            body = parameters.get("body", "")
            return f'Go to Gmail, click compose, fill in To: {to}, Subject: {subject}, Body: {body}, then close to save as draft. Do NOT send.'

        return f"Execute {self.config.name} with parameters: {parameters}"

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
