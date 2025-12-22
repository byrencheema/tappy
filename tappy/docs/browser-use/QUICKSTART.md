# Quick Start: Adding a New Skill

## 5-Minute Guide

### Step 1: Add Parameter Schema
**File:** `apps/api/app/skills.py`

```python
class RestaurantSearchParameters(BaseSkillParameters):
    """Parameters for restaurant search skill."""
    location: str = Field(..., description="City or neighborhood")
    cuisine: str = Field(default="any", description="Type of cuisine")
    price_range: str = Field(default="$$", description="Price range: $, $$, $$$, $$$$")
```

### Step 2: Add Formatter Function
**File:** `apps/api/app/skill_definitions.py`

```python
def format_restaurant_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format restaurant results for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="🍽️ Restaurant Search Failed",
            message=f"Unable to find restaurants: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        data = output.get("result", {}).get("data", {})
        restaurants = data.get("restaurants", [])

        if not restaurants:
            return FormattedSkillResult(
                title="🍽️ No Restaurants Found",
                message="Try different search criteria.",
                status="pending"
            )

        # Format restaurants
        restaurant_lines = []
        for idx, restaurant in enumerate(restaurants[:5], 1):
            name = restaurant.get("name", "Unknown")
            rating = restaurant.get("rating", "N/A")
            price = restaurant.get("price_level", "$$")

            restaurant_lines.append(f"{idx}. {name}")
            restaurant_lines.append(f"   ⭐ {rating} | {price}")
            restaurant_lines.append("")

        return FormattedSkillResult(
            title=f"🍽️ Found {len(restaurants)} restaurants",
            message="\n".join(restaurant_lines),
            action="View on Map",
            status="needs_confirmation"
        )
    except Exception as e:
        return FormattedSkillResult(
            title="🍽️ Restaurant - Format Error",
            message=f"Error formatting results: {str(e)}",
            status="pending"
        )
```

### Step 3: Create Config
**File:** `apps/api/app/skill_definitions.py`

```python
restaurant_config = SkillConfig(
    id="your-skill-uuid-here",  # Get from Browser Use Cloud
    name="Restaurant Search",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Searches for restaurants in a location",
    parameter_schema=RestaurantSearchParameters,
    example_params={
        "location": "San Francisco",
        "cuisine": "Italian",
        "price_range": "$$"
    },
    planner_hints=(
        "Use when user wants: restaurant recommendations, places to eat, "
        "dinner spots, lunch options, food recommendations."
    )
)

restaurant_handler = BrowserUseSkillHandler(
    config=restaurant_config,
    formatter=format_restaurant_result
)
```

### Step 4: Register
**File:** `apps/api/app/skill_definitions.py`

Find the `register_all_skills()` function and add your skill:

```python
def register_all_skills():
    """Register all available skills with the global registry."""
    skills_to_register = [
        (job_search_config, job_search_handler),
        (hackernews_config, hackernews_handler),
        (weather_config, weather_handler),
        (news_config, news_handler),
        (restaurant_config, restaurant_handler),  # 👈 Add this line
    ]

    for config, handler in skills_to_register:
        register_skill(config, handler)

    print(f"✓ Registered {len(skills_to_register)} skill(s)")
```

### Step 5: Don't Forget the Import!
**File:** `apps/api/app/skill_definitions.py` (top of file)

```python
from app.skills import (
    BrowserUseSkillHandler,
    FormattedSkillResult,
    JobSearchParameters,
    HackerNewsParameters,
    WeatherParameters,
    NewsSearchParameters,
    RestaurantSearchParameters,  # 👈 Add this
    SkillConfig,
    SkillStatus,
    SkillType,
    register_skill,
)
```

### Step 6: Test
```bash
cd apps/api
python test_skills.py
```

## Getting Skill IDs

### Option 1: Use the UI (Recommended)
1. Go to [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Click "Create Skill"
3. Describe: "Search for restaurants in a location with filters for cuisine and price"
4. Wait for it to build
5. Copy the skill UUID
6. Paste into your config

### Option 2: Use the API
```bash
curl -X POST https://api.browser-use.com/api/v2/skills \
  -H "X-Browser-Use-API-Key: $BROWSER_USE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrompt": "Search for restaurants with filters",
    "goal": "Find restaurants in a location"
  }'
```

## Testing Your Skill

### 1. Unit Test
```python
# In apps/api/test_skills.py
# The test automatically picks up all registered skills
```

### 2. Integration Test
```bash
curl -X POST http://localhost:8001/journal \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need restaurant recommendations in SF for Italian food",
    "content_json": "{\"blocks\": []}"
  }'
```

### 3. Check Planner Output
The planner should recognize your skill:
```json
{
  "should_act": true,
  "skill_name": "Restaurant Search",
  "parameters": {
    "location": "SF",
    "cuisine": "Italian"
  }
}
```

## Common Patterns

### Data Retrieval Skills
- Job search, news, weather, restaurants, events
- Return lists of items
- Format with emojis for visual appeal
- Include action buttons like "View More", "Read Article"

### Analysis Skills
- Research, summarization, comparison
- Return formatted text
- Include sources and citations
- Action: "Read Full Report"

### Action Skills (requires auth)
- Email, calendar, booking
- Return confirmation
- Be careful with privacy (cookies required)
- Action: "View Confirmation"

## Tips

1. **Flexible Parsing** - API responses vary, use `.get()` with fallbacks
2. **Limit Results** - Don't overwhelm inbox (5-8 items max)
3. **Rich Formatting** - Use emojis, newlines, bullets
4. **Error Handling** - Always handle missing data gracefully
5. **Clear Hints** - Help the planner with specific trigger words

## Example Journal Entries

Test your skill with these:

**Restaurant:**
"Need a good Italian restaurant in SF for a date night"

**Weather:**
"What's the weather like in Tokyo next week?"

**News:**
"Show me the latest AI news"

**Jobs:**
"Looking for senior Python jobs in NYC"

**HackerNews:**
"What's trending on HN?"

## Debugging

### Skill Not Triggering?
- Check `planner_hints` - add more keywords
- Test with explicit phrases
- Check logs: skill should appear in planner context

### Execution Failing?
- Verify skill ID is correct
- Check `BROWSER_USE_API_KEY` in .env
- Enable test mode: `SKILLS_TEST_MODE=true`

### Formatting Broken?
- Check Browser Use response structure
- Add flexible parsing with fallbacks
- Test with mock data first

## Next Steps

Once your skill works:
1. Add more sophisticated parameter extraction
2. Implement result caching
3. Add skill-specific metadata
4. Create custom UI components for rich display
5. Chain skills together for complex workflows

Happy skill building! 🚀
