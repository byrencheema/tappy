"""
Create Browser Use Skills via API and update skill_definitions.py with real IDs.

This script:
1. Creates HackerNews, Weather, and News Search skills via Browser Use API
2. Polls until they're ready
3. Updates skill_definitions.py with the real skill IDs
"""

import asyncio
import httpx
import os
import re
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv(Path(__file__).parent / ".env")

API_KEY = os.getenv("BROWSER_USE_API_KEY")
API_URL = "https://api.browser-use.com/api/v2"

SKILLS_TO_CREATE = [
    {
        "name": "HackerNews Top Posts",
        "agent_prompt": "Go to hackernews.com and extract the top X posts with their titles, scores, and URLs",
        "goal": "Extract top posts from HackerNews",
        "placeholder_id": "placeholder-hackernews-uuid"
    },
    {
        "name": "Weather Forecast",
        "agent_prompt": "Get the weather forecast for a given location for the next X days, including temperature, conditions, and any weather alerts",
        "goal": "Get weather forecast for a location",
        "placeholder_id": "placeholder-weather-uuid"
    },
    {
        "name": "News Search",
        "agent_prompt": "Search for news articles on a given topic/query and return the top X articles with titles, sources, and publish dates",
        "goal": "Search for news articles on any topic",
        "placeholder_id": "placeholder-news-uuid"
    }
]


async def create_skill(skill_def):
    """Create a skill via Browser Use API."""
    print(f"\n📝 Creating skill: {skill_def['name']}")

    headers = {
        "X-Browser-Use-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "agentPrompt": skill_def["agent_prompt"],
        "goal": skill_def["goal"]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_URL}/skills",
            json=payload,
            headers=headers
        )

        # 202 = Accepted (async operation started)
        if response.status_code not in [200, 202]:
            print(f"  ✗ Failed: {response.status_code} - {response.text}")
            return None

        data = response.json()
        skill_id = data.get("id")
        print(f"  ✓ Created with ID: {skill_id}")

        status = data.get("status")
        if status:
            print(f"  ⏳ Status: {status}")

        return skill_id


async def poll_skill_status(skill_id, timeout=180):
    """Poll skill status until it's finished or timeout."""
    print(f"\n⏳ Polling skill {skill_id[:8]}... (max {timeout}s)")

    headers = {
        "X-Browser-Use-API-Key": API_KEY
    }

    start_time = asyncio.get_event_loop().time()

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                print(f"  ⚠️  Timeout after {timeout}s")
                return "timeout"

            response = await client.get(
                f"{API_URL}/skills/{skill_id}",
                headers=headers
            )

            if response.status_code != 200:
                print(f"  ✗ Failed to get status: {response.status_code}")
                return "error"

            data = response.json()
            status = data.get("status")

            print(f"  Status: {status} ({int(elapsed)}s elapsed)")

            if status == "finished":
                print(f"  ✓ Skill ready!")
                return "finished"
            elif status == "failed":
                print(f"  ✗ Skill creation failed")
                return "failed"

            await asyncio.sleep(3)


async def update_skill_definitions(skill_mapping):
    """Update skill_definitions.py with real skill IDs."""
    print("\n📝 Updating skill_definitions.py...")

    skill_def_path = Path(__file__).parent / "app" / "skill_definitions.py"

    with open(skill_def_path, "r") as f:
        content = f.read()

    original_content = content

    for placeholder, real_id in skill_mapping.items():
        if real_id:
            print(f"  Replacing {placeholder[:20]}... with {real_id[:20]}...")
            content = content.replace(f'"{placeholder}"', f'"{real_id}"')

    if content != original_content:
        with open(skill_def_path, "w") as f:
            f.write(content)
        print("  ✓ File updated!")
    else:
        print("  ⚠️  No changes made")


async def main():
    """Main function to create all skills."""
    print("=" * 60)
    print("Browser Use Skill Creator")
    print("=" * 60)

    if not API_KEY:
        print("✗ BROWSER_USE_API_KEY not found in .env")
        return

    print(f"✓ API Key found: {API_KEY[:10]}...")

    skill_mapping = {}

    for skill_def in SKILLS_TO_CREATE:
        try:
            # Create skill
            skill_id = await create_skill(skill_def)

            if not skill_id:
                print(f"  ⚠️  Skipping {skill_def['name']}")
                continue

            # Poll until ready
            status = await poll_skill_status(skill_id)

            if status == "finished":
                skill_mapping[skill_def["placeholder_id"]] = skill_id
            else:
                print(f"  ⚠️  Skill not ready, skipping")

        except Exception as e:
            print(f"  ✗ Error: {e}")
            continue

    # Update skill definitions
    if skill_mapping:
        await update_skill_definitions(skill_mapping)

        print("\n" + "=" * 60)
        print("✓ Skill Creation Complete!")
        print("=" * 60)
        print("\nCreated skills:")
        for placeholder, real_id in skill_mapping.items():
            print(f"  • {real_id}")

        print("\nNext steps:")
        print("  1. Restart your API server")
        print("  2. Test with: python /tmp/test_api.py")
    else:
        print("\n⚠️  No skills were created successfully")


if __name__ == "__main__":
    asyncio.run(main())
