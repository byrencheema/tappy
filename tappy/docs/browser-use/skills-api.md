# Browser Use Skills API

**Skills** are your API for anything. Describe what you need in plain text, and get a production-ready API endpoint you can call repeatedly.

## Creating Skills

### Via UI (Recommended)

The easiest way to create skills is through the [Cloud Dashboard](https://cloud.browser-use.com/skills). Use **manual mode** to describe exactly what you want, then test and refine until it works perfectly.

1. Go to [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Click "Create Skill" and use manual mode
3. Describe your automation goal
4. Wait for it to build and test
5. Execute via UI or API

### Via API

#### TypeScript
```typescript
const skillResponse = await client.skills.createSkill({
    agentPrompt: "Go to hackernews and extract top X posts",
    goal: "Extract top X posts from HackerNews",
});
```

#### Python
```python
skill_response = await client.skills.create_skill(
    agent_prompt="Go to hackernews and extract top X posts",
    goal="Extract top X posts from HackerNews",
)
```

#### cURL
```bash
curl -X POST https://api.browser-use.com/api/v2/skills \
  -H "X-Browser-Use-API-Key: bu_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrompt": "Go to hackernews and extract top X posts",
    "goal": "Extract top X posts from HackerNews"
  }'
```

## Polling Status

Skills build asynchronously. Poll until `finished`:

#### TypeScript
```typescript
let skillStatus = await client.skills.getSkill({ skill_id: skillResponse.id });
while (skillStatus.status !== "finished") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    skillStatus = await client.skills.getSkill({ skill_id: skillResponse.id });
}
```

#### Python
```python
skill_status = await client.skills.get_skill(skill_id=skill_response.id)
while skill_status.status != "finished":
    await asyncio.sleep(2)
    skill_status = await client.skills.get_skill(skill_id=skill_response.id)
```

#### cURL
```bash
curl -X GET https://api.browser-use.com/api/v2/skills/{skill_id} \
  -H "X-Browser-Use-API-Key: bu_..."
```

## Getting Schemas

Once finished, get the parameter and output schemas:

#### TypeScript
```typescript
const skill = await client.skills.getSkill({ skill_id: skillResponse.id });
const parameterSchema = skill.parameters;
const outputSchema = skill.outputSchema;
```

#### Python
```python
skill = await client.skills.get_skill(skill_id=skill_response.id)
parameter_schema = skill.parameters
output_schema = skill.output_schema
```

#### cURL
```bash
curl -X GET https://api.browser-use.com/api/v2/skills/{skill_id} \
  -H "X-Browser-Use-API-Key: bu_..."
```

## Executing Skills

Execute with the required parameters:

#### TypeScript
```typescript
await client.skills.executeSkill({
    skill_id: skill.id,
    parameters: { X: 10 }
});
```

#### Python
```python
await client.skills.execute_skill(
    skill_id=skill.id,
    parameters={"X": 10}
)
```

#### cURL
```bash
curl -X POST https://api.browser-use.com/api/v2/skills/{skill_id}/execute \
  -H "X-Browser-Use-API-Key: bu_..." \
  -H "Content-Type: application/json" \
  -d '{"parameters": {"X": 10}}'
```

## Refining Skills

If execution fails, refine with feedback:

#### TypeScript
```typescript
await client.skills.refineSkill(skill.id, {
    feedback: "Also extract post scores and comment counts"
});
```

#### Python
```python
await client.skills.refine_skill(
    skill.id,
    feedback="Also extract post scores and comment counts"
)
```

#### cURL
```bash
curl -X POST https://api.browser-use.com/api/v2/skills/{skill_id}/refine \
  -H "X-Browser-Use-API-Key: bu_..." \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Also extract post scores and comment counts"}'
```

## Pricing

**Generation**: Free
**Execution**: $0.01 per API call

## Cookie Handling

Cookies are automatically injected from your browser when using the Python/JS SDK. For API-only usage, cookies must be provided in the execution request.

## Full Example (Python SDK)

```python
from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def main():
    agent = Agent(
        task='Analyze TikTak and Instagram profiles',
        skills=[
            'a582eb44-e4e2-4c55-acc2-2f5a875e35e9',  # TikTak Profile Scraper
            'f8d91c2a-3b4e-4f7d-9a1e-6c8e2d3f4a5b',  # Instagram Profile Scraper
        ],
        llm=ChatBrowserUse()
    )

    await agent.run()
    await agent.close()

asyncio.run(main())
```

Browse and create skills at [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills).
