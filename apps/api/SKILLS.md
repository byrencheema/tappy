# Browser Use Skills

Skills are your API for anything. Describe what you need in plain text, and get a production-ready API endpoint you can call repeatedly.

## Creating Skills

### Via UI (Recommended)

1. Go to [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Click "Create Skill" and use manual mode
3. Describe your automation goal
4. Wait for it to build and test
5. Execute via UI or API

### Via API

```python
skill_response = await client.skills.create_skill(
    agent_prompt="Go to hackernews and extract top X posts",
    goal="Extract top X posts from HackerNews",
)
```

### Polling Status

Skills build asynchronously. Poll until finished:

```python
skill_status = await client.skills.get_skill(skill_id=skill_response.id)
while skill_status.status != "finished":
    await asyncio.sleep(2)
    skill_status = await client.skills.get_skill(skill_id=skill_response.id)
```

### Getting Schemas

Once finished, get the parameter and output schemas:

```python
skill = await client.skills.get_skill(skill_id=skill_response.id)
parameter_schema = skill.parameters
output_schema = skill.output_schema
```

## Executing Skills

Execute with the required parameters:

```python
await client.skills.execute_skill(
    skill_id=skill.id,
    parameters={"X": 10}
)
```

## Refining Skills

If execution fails, refine with feedback:

```python
await client.skills.refine_skill(
    skill.id,
    feedback="Also extract post scores and comment counts"
)
```

## Using Skills with Agent

For authenticated actions (like posting tweets), use the Agent with skills:

```python
from browser_use import Agent, ChatBrowserUse

agent = Agent(
    task='Post a tweet saying "Hello World"',
    skills=['tweet-poster-skill-id'],
    llm=ChatBrowserUse()
)

await agent.run()
await agent.close()
```

The Agent handles cookie injection automatically for authenticated sites.

## Registered Skills

| Skill | ID | Type |
|-------|-----|------|
| Tech Job Search | `805c9a12-9d9d-4d64-8234-9d8b378cf6cf` | data_retrieval |
| HackerNews Top Posts | `962a620b-607b-4c08-a51f-0376f24c1938` | data_retrieval |
| Weather Forecast | `911880ed-b5a9-408e-803e-db1279585bab` | data_retrieval |
| News Search | `7ed94633-2162-4b78-a958-ba924b58c6e0` | data_retrieval |

## Adding New Skills

1. Create skill on Browser Use Cloud
2. Add parameter schema to `app/skills.py`
3. Add formatter and config to `app/skill_definitions.py`
4. Register in `register_all_skills()`
