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

## Authenticated Actions

For ACTION type skills (like posting tweets), the system automatically uses the Session+Task API
with profile-based cookie injection. This requires `BROWSER_USE_PROFILE_ID` in your `.env`.

The flow:
1. Creates a session with your profile (cookies injected)
2. Runs a task that uses the skill
3. Polls for completion
4. Cleans up the session

Profile setup:
1. Go to [cloud.browser-use.com](https://cloud.browser-use.com)
2. Create a browser profile and log into sites you need (e.g., X.com)
3. Copy the profile ID to your `.env` as `BROWSER_USE_PROFILE_ID`

## Registered Skills

| Skill | ID | Type |
|-------|-----|------|
| Tech Job Search | `805c9a12-9d9d-4d64-8234-9d8b378cf6cf` | data_retrieval |
| HackerNews Top Posts | `962a620b-607b-4c08-a51f-0376f24c1938` | data_retrieval |
| Weather Forecast | `911880ed-b5a9-408e-803e-db1279585bab` | data_retrieval |
| News Search | `7ed94633-2162-4b78-a958-ba924b58c6e0` | data_retrieval |
| X.com Post Maker | `eb6153e1-1e95-4e5b-88ac-5158c9207b9c` | action |
| Google Calendar | `20f63d34-afa9-4e18-b361-47edd270c3ca` | action |
| YouTube Search | `e6cec7da-4d28-4fc2-91e5-0f7cf4602196` | data_retrieval |
| Amazon Add to Cart | `adbd36f2-a522-4f06-b458-946bd236ded2` | action |
| Save Gmail Draft | `27441e62-faaf-4c15-855a-f7bbb479bbf0` | action |

## Adding New Skills

### Data Retrieval Skills (fast, direct API call)

1. Create skill on [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Add parameter schema to `app/skills.py`
3. Add formatter and config to `app/skill_definitions.py` with `SkillType.DATA_RETRIEVAL`
4. Register in `register_all_skills()`

### Action Skills (authenticated, uses browser session)

1. Create skill on [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Log into the required site in your Browser Use profile
3. Add parameter schema to `app/skills.py`
4. Add formatter and config to `app/skill_definitions.py` with `SkillType.ACTION`
5. Add task description builder in `_build_task_description()` in `app/skills.py`
6. Register in `register_all_skills()`

**Note:** Action skills run a full browser session (~30-40s) vs instant for data retrieval.
