# Tappy Skills System

## Overview

The Tappy Skills System is a modular, registry-based architecture for integrating Browser Use Cloud skills into the journal workflow. It provides a clean separation between skill configuration, execution, and result formatting.

## Architecture

### Core Components

1. **Skill Registry** (`skills.py`)
   - Central registry for all available skills
   - Maps skill IDs to handlers and configurations
   - Generates planner context dynamically

2. **Skill Definitions** (`skill_definitions.py`)
   - Configures individual skills
   - Defines parameter schemas
   - Implements custom formatters for results

3. **Skill Types**
   - `DATA_RETRIEVAL`: Returns structured data (e.g., job search, news)
   - `ACTION`: Performs actions (e.g., send email, book appointment)
   - `ANALYSIS`: Returns text analysis (e.g., research, summarize)
   - `INTERACTIVE`: Has progress updates (e.g., browser automation)

## Adding a New Skill

### Step 1: Define Parameter Schema

```python
# In skills.py or skill_definitions.py
class YourSkillParameters(BaseSkillParameters):
    """Parameters for your skill."""
    param1: str = Field(..., description="Description")
    param2: Optional[int] = Field(None, description="Optional param")
```

### Step 2: Create Result Formatter

```python
# In skill_definitions.py
def format_your_skill_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format your skill results for inbox display."""

    if result.status == SkillStatus.FAILED:
        return FormattedSkillResult(
            title="❌ Your Skill Failed",
            message=f"Error: {result.error}",
            status="pending"
        )

    # Extract data from result.output
    data = result.output.get("result", {}).get("data", {})

    # Format for display
    return FormattedSkillResult(
        title="✅ Your Skill Completed",
        message="Formatted result message",
        action="View Details",
        status="needs_confirmation"
    )
```

### Step 3: Configure the Skill

```python
# In skill_definitions.py
your_skill_config = SkillConfig(
    id="your-skill-uuid-from-browser-use",
    name="Your Skill Name",
    skill_type=SkillType.DATA_RETRIEVAL,  # or ACTION, ANALYSIS, INTERACTIVE
    description="What this skill does",
    parameter_schema=YourSkillParameters,
    example_params={
        "param1": "example value",
        "param2": 10
    },
    planner_hints=(
        "Use when user mentions: keywords, phrases, or intents. "
        "Provide guidance on when to trigger this skill."
    )
)

your_skill_handler = BrowserUseSkillHandler(
    config=your_skill_config,
    formatter=format_your_skill_result
)
```

### Step 4: Register the Skill

```python
# In skill_definitions.py -> register_all_skills()
def register_all_skills():
    """Register all available skills with the global registry."""
    register_skill(job_search_config, job_search_handler)
    register_skill(your_skill_config, your_skill_handler)  # Add this line

    print(f"✓ Registered {count} skill(s)")
```

## How It Works

### 1. Journal Entry Creation

```
User writes journal entry
    ↓
POST /journal
```

### 2. Planning Phase

```python
# Automatically generates prompt with all registered skills
plan = await _plan_action(text)

# Returns:
PlannerResult(
    should_act=True,
    skill_id="skill-uuid",
    skill_name="skill_name",
    parameters={...},
    reason="Why this skill was chosen"
)
```

### 3. Execution Phase

```python
# Uses registry to find handler
execution = await _execute_skill(skill_id, parameters)

# Handler executes via Browser Use Cloud API
# Returns:
SkillExecutionResult(
    status="completed",
    skill_id="...",
    skill_name="...",
    skill_type="data_retrieval",
    output={...},
    metadata={...}
)
```

### 4. Formatting Phase

```python
# Uses skill's custom formatter
formatted = handler.format_result(execution)

# Creates inbox item
InboxItem(
    title=formatted.title,
    message=formatted.message,
    action=formatted.action,
    status=formatted.status
)
```

### 5. Response with Agentic Steps

```python
JournalCreateResponse(
    entry={...},
    plan={...},
    execution={...},
    inbox_item={...},
    agentic_steps=[
        {"type": "planning", "status": "completed", "title": "Analyzing journal entry", ...},
        {"type": "execution", "status": "completed", "title": "Executing skill", ...},
        {"type": "formatting", "status": "completed", "title": "Formatting results", ...}
    ]
)
```

## Frontend Integration

### TypeScript Types

The frontend mirrors backend schemas:

```typescript
type AgenticStep = {
  type: "planning" | "execution" | "formatting";
  status: "pending" | "running" | "completed" | "failed";
  title: string;
  message?: string;
  timestamp: string;
};

type JournalCreateResponse = {
  entry: JournalEntryResponse;
  plan: PlannerResult;
  execution: SkillExecutionResult | null;
  inbox_item: InboxItemResponse | null;
  agentic_steps?: AgenticStep[];
};
```

### Rendering Agentic Steps

```tsx
import AgenticSteps from "@/components/AgenticSteps";

// In your component
{response?.agentic_steps && (
  <AgenticSteps steps={response.agentic_steps} />
)}
```

## Extending the System

### Custom Skill Handlers

For skills that don't use Browser Use Cloud:

```python
class CustomSkillHandler(SkillHandler):
    async def execute(self, parameters: BaseSkillParameters, api_key: str) -> SkillExecutionResult:
        # Custom execution logic
        result = await your_custom_api_call(parameters)

        return SkillExecutionResult(
            status=SkillStatus.COMPLETED,
            skill_id=self.config.id,
            skill_name=self.config.name,
            skill_type=self.config.skill_type,
            output=result
        )

    def format_result(self, result: SkillExecutionResult) -> FormattedSkillResult:
        # Custom formatting
        pass

    def validate_output(self, output: Any) -> bool:
        # Custom validation
        pass
```

### Progress/Streaming Support

For interactive skills with progress updates, extend `SkillExecutionResult` to include:

```python
class StreamingSkillExecutionResult(SkillExecutionResult):
    progress: float = 0.0  # 0-100
    current_step: Optional[str] = None
    intermediate_results: List[Any] = []
```

Then implement streaming in the execution flow.

## Benefits

1. **Modular**: Each skill is self-contained with its own config, params, and formatter
2. **Dynamic**: Planner automatically learns about new skills
3. **Type-Safe**: Parameter schemas validated with Pydantic
4. **Extensible**: Easy to add new skill types and handlers
5. **Observable**: Agentic steps provide visibility into the workflow
6. **Frontend-Agnostic**: Skills can be rendered differently based on type

## Configuration Files

- `skills.py` - Core system (registry, base classes, types)
- `skill_definitions.py` - Skill configurations and formatters
- `main.py` - Integration with FastAPI endpoints
- `schemas.py` - Pydantic schemas for API
- `types/api.ts` - TypeScript types (frontend)
- `components/AgenticSteps.tsx` - React component for rendering steps

## Environment Variables

```bash
# Required
BROWSER_USE_API_KEY=your-key-here

# Optional
BROWSER_USE_API_URL=https://api.browser-use.com/api/v2  # Default
```

## Example: Complete Skill Definition

```python
# 1. Define parameters
class WeatherParameters(BaseSkillParameters):
    location: str
    units: str = "metric"

# 2. Create formatter
def format_weather_result(result: SkillExecutionResult) -> FormattedSkillResult:
    if result.status == SkillStatus.FAILED:
        return FormattedSkillResult(
            title="🌤️ Weather Check Failed",
            message=f"Could not fetch weather: {result.error}",
            status="pending"
        )

    data = result.output.get("result", {}).get("data", {})
    temp = data.get("temperature")
    condition = data.get("condition")

    return FormattedSkillResult(
        title=f"🌤️ Weather for {data.get('location')}",
        message=f"{temp}° - {condition}",
        action="View Forecast",
        status="completed"
    )

# 3. Configure
weather_config = SkillConfig(
    id="weather-skill-uuid",
    name="Weather Check",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Gets current weather for a location",
    parameter_schema=WeatherParameters,
    example_params={"location": "San Francisco", "units": "metric"},
    planner_hints="Use when user asks about weather, temperature, or forecast for a location."
)

# 4. Create handler
weather_handler = BrowserUseSkillHandler(
    config=weather_config,
    formatter=format_weather_result
)

# 5. Register
register_skill(weather_config, weather_handler)
```

## Troubleshooting

### Skill Not Triggering

1. Check if skill is registered in `register_all_skills()`
2. Verify `planner_hints` are clear and match user intent
3. Test the planner prompt directly

### Execution Failing

1. Verify `BROWSER_USE_API_KEY` is set
2. Check skill UUID is correct
3. Validate parameter schema matches skill requirements
4. Review Browser Use Cloud API documentation

### Formatting Issues

1. Ensure formatter handles all output structures
2. Check for nested data in `result.output`
3. Add error handling for missing fields
4. Test with sample data

## Future Enhancements

- [ ] Streaming/progress updates for long-running skills
- [ ] Skill versioning and migration
- [ ] Skill permissions and rate limiting
- [ ] Async job queue for background execution
- [ ] Skill marketplace integration
- [ ] Local Browser Use support (not just cloud)
- [ ] Skill composition (chaining skills)
- [ ] Conditional skill execution (if-then rules)
