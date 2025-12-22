# Browser Use Integration Guide

## Current Integration

Tappy integrates with Browser Use Cloud Skills via direct HTTP API calls. Skills are registered in the skill registry and executed when the planner determines they're needed based on journal entries.

## Architecture

```
Journal Entry → Planner (Gemini) → Skill Execution → Result Formatting → Inbox Item
```

### Components

1. **Skill Registry** (`apps/api/app/skills.py`)
   - Central registry for all available skills
   - Type-safe parameter schemas
   - Extensible handler pattern

2. **Skill Definitions** (`apps/api/app/skill_definitions.py`)
   - Individual skill configurations
   - Custom formatters for each skill
   - Parameter schemas (Pydantic)

3. **Planner** (`apps/api/app/main.py`)
   - Uses Gemini to analyze journal entries
   - Decides which skill (if any) to execute
   - Extracts parameters from natural language

4. **Executor** (`apps/api/app/main.py`)
   - Calls Browser Use API
   - Handles errors and timeouts
   - Returns structured results

## API Endpoints Used

- **Skill Execution**: `POST https://api.browser-use.com/api/v2/skills/{skill_id}/execute`
- **Skill Info**: `GET https://api.browser-use.com/api/v2/skills/{skill_id}`

## Environment Variables

```bash
BROWSER_USE_API_KEY=bu_...        # Required for skill execution
BROWSER_USE_API_URL=https://api.browser-use.com/api/v2  # Optional, defaults to v2
SKILLS_TEST_MODE=true             # Optional, returns mock data without API calls
```

## Adding New Skills

### 1. Create Parameter Schema
```python
class NewsSearchParameters(BaseSkillParameters):
    query: str = Field(..., description="Search query for news articles")
    limit: int = Field(default=5, ge=1, le=20)
```

### 2. Write Formatter
```python
def format_news_result(result: SkillExecutionResult) -> FormattedSkillResult:
    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="📰 News Search Failed",
            message=f"Error: {result.error}",
            status="pending"
        )

    # Parse and format results
    articles = result.output.get("result", {}).get("articles", [])

    return FormattedSkillResult(
        title=f"📰 Found {len(articles)} articles",
        message=format_articles(articles),
        action="Read More",
        status="needs_confirmation"
    )
```

### 3. Configure Skill
```python
news_config = SkillConfig(
    id="skill-uuid-from-browser-use",
    name="News Search",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Searches for news articles on any topic",
    parameter_schema=NewsSearchParameters,
    example_params={"query": "AI developments", "limit": 5},
    planner_hints="Use when user wants news, articles, or updates on topics"
)
```

### 4. Register
```python
news_handler = BrowserUseSkillHandler(news_config, format_news_result)
register_skill(news_config, news_handler)
```

## Testing

### Test Mode
Set `SKILLS_TEST_MODE=true` in `.env` to test without making actual API calls:

```python
# Returns mock data
execution = await _execute_skill(skill_id, parameters)
```

### Manual Testing
```bash
# Test via API endpoint
curl -X POST http://localhost:8000/journal \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need to find ML engineer jobs in San Francisco",
    "content_json": "{\"blocks\":[]}"
  }'
```

## Best Practices

1. **Parameter Validation**: Use Pydantic schemas for type safety
2. **Error Handling**: Always handle API failures gracefully
3. **Formatting**: Provide rich, human-readable inbox items
4. **Planner Hints**: Give clear examples of when to use each skill
5. **Testing**: Use test mode during development

## Privacy Considerations

- Skills execute in Browser Use Cloud (not local)
- No cookies are sent by default (API-only integration)
- Only public data retrieval skills recommended
- Avoid skills requiring authentication unless necessary
