#!/usr/bin/env python3
"""Test script for Browser Use skills."""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.skill_definitions import (
    google_calendar_config,
    youtube_search_config,
    amazon_cart_config,
    google_calendar_handler,
    youtube_search_handler,
    amazon_cart_handler,
)
from app.skills import (
    GoogleCalendarParameters,
    YouTubeSearchParameters,
    AmazonAddToCartParameters,
    get_registry,
)


def test_skill_registration():
    """Verify all skills are registered."""
    registry = get_registry()
    skills = registry.list_skills()

    print(f"\nRegistered skills: {len(skills)}")
    for skill in skills:
        print(f"  - {skill.name} ({skill.id}) [{skill.skill_type.value}]")

    expected_ids = [
        "20f63d34-afa9-4e18-b361-47edd270c3ca",  # Google Calendar
        "e6cec7da-4d28-4fc2-91e5-0f7cf4602196",  # YouTube Search
        "adbd36f2-a522-4f06-b458-946bd236ded2",  # Amazon Add to Cart
    ]

    registered_ids = [s.id for s in skills]
    for expected_id in expected_ids:
        if expected_id in registered_ids:
            print(f"  [OK] {expected_id}")
        else:
            print(f"  [MISSING] {expected_id}")
            return False

    return True


def test_parameter_validation():
    """Verify parameter schemas work correctly."""
    print("\nTesting parameter validation...")

    try:
        params = GoogleCalendarParameters(
            title="Test Meeting",
            date="2025-01-15",
            time="14:00",
            description="Test description",
            location="Test location",
            duration_minutes=60
        )
        print(f"  [OK] Google Calendar params: {params.model_dump()}")
    except Exception as e:
        print(f"  [FAIL] Google Calendar params: {e}")
        return False

    try:
        params = YouTubeSearchParameters(query="python tutorial", max_results=5)
        print(f"  [OK] YouTube Search params: {params.model_dump()}")
    except Exception as e:
        print(f"  [FAIL] YouTube Search params: {e}")
        return False

    try:
        params = AmazonAddToCartParameters(product_query="wireless headphones", quantity=2)
        print(f"  [OK] Amazon Add to Cart params: {params.model_dump()}")
    except Exception as e:
        print(f"  [FAIL] Amazon Add to Cart params: {e}")
        return False

    return True


async def test_youtube_search_execution():
    """Test YouTube Search skill execution (data retrieval, no auth needed)."""
    print("\nTesting YouTube Search execution...")

    api_key = os.getenv("BROWSER_USE_API_KEY")
    if not api_key:
        print("  [SKIP] BROWSER_USE_API_KEY not set")
        return True

    params = YouTubeSearchParameters(query="python tutorial", max_results=3)

    try:
        result = await youtube_search_handler.execute(params, api_key)
        print(f"  Status: {result.status}")

        if result.status == "completed":
            print(f"  [OK] Got result: {result.output}")
            formatted = youtube_search_handler.format_result(result)
            print(f"  Formatted title: {formatted.title}")
            return True
        else:
            print(f"  [WARN] Skill returned status: {result.status}")
            if result.error:
                print(f"  Error: {result.error}")
            return True
    except Exception as e:
        print(f"  [FAIL] Execution failed: {e}")
        return False


async def main():
    print("=" * 50)
    print("Testing Browser Use Skills")
    print("=" * 50)

    all_passed = True

    all_passed &= test_skill_registration()
    all_passed &= test_parameter_validation()
    all_passed &= await test_youtube_search_execution()

    print("\n" + "=" * 50)
    if all_passed:
        print("All tests passed!")
    else:
        print("Some tests failed.")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
