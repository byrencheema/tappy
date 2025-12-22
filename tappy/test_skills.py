#!/usr/bin/env python3
"""
Test script for Tappy skills.
Tests each skill's execution directly using the BrowserUseSkillHandler.
"""

import asyncio
import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / "apps" / "api" / ".env")

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

from app.skills import (
    BrowserUseSkillHandler,
    JobSearchParameters,
    YouTubeSearchParameters,
    XPostParameters,
    GoogleCalendarParameters,
    AmazonAddToCartParameters,
    EmailParameters,
    HackerNewsParameters,
    WeatherParameters,
    NewsSearchParameters,
)
from app.skill_definitions import (
    job_search_handler,
    youtube_search_handler,
    xpost_handler,
    google_calendar_handler,
    amazon_cart_handler,
    gmail_draft_handler,
    hackernews_handler,
    weather_handler,
    news_handler,
)


async def test_skill(name: str, handler: BrowserUseSkillHandler, params: dict, api_key: str, profile_id: str) -> None:
    """Test a single skill."""
    print(f"\n{'='*70}")
    print(f"Testing: {name}")
    print(f"{'='*70}")
    print(f"Parameters: {json.dumps(params, indent=2)}")

    try:
        # Convert dict to the appropriate parameter schema
        param_schema = handler.config.parameter_schema
        param_instance = param_schema(**params)

        result = await handler.execute(param_instance, api_key=api_key, profile_id=profile_id)
        print(f"\n✓ Success!")
        print(f"Status: {result.status}")
        print(f"Output: {json.dumps(result.output, indent=2)}")

        # Format the result if successful
        if result.status == "success":
            formatted = handler.formatter(result)
            print(f"\nFormatted Result:")
            print(f"  Title: {formatted.title}")
            print(f"  Message: {formatted.message}")
            if formatted.action:
                print(f"  Action: {formatted.action}")
            print(f"  Status: {formatted.status}")
    except Exception as e:
        import traceback
        print(f"✗ Error: {type(e).__name__}: {e}")
        traceback.print_exc()


async def main():
    """Run all skill tests."""
    print("🧪 Tappy Skills Test Suite")
    print("Testing skills that need verification...\n")

    # Get API key and profile ID from environment
    api_key = os.getenv("BROWSER_USE_API_KEY")
    profile_id = os.getenv("BROWSER_USE_PROFILE_ID")

    if not api_key:
        print("✗ Error: BROWSER_USE_API_KEY not set in environment")
        return

    if not profile_id:
        print("✗ Error: BROWSER_USE_PROFILE_ID not set in environment")
        return

    print(f"Using Browser Use API Key: {api_key[:20]}...")
    print(f"Using Profile ID: {profile_id}\n")

    # Working skills (for reference)
    working = [
        ("Weather Forecast", weather_handler, {"location": "San Francisco", "days": 3, "units": "e"}),
        ("HackerNews Top Posts", hackernews_handler, {"limit": 5}),
        ("Tech Job Search", job_search_handler, {"query": "python engineer", "limit": 5}),
        ("News Search", news_handler, {"query": "AI developments", "max_results": 5}),
    ]

    # Skills to test
    to_test = [
        ("YouTube Search", youtube_search_handler, {"query": "Python tutorials", "max_results": 5}),
        ("X.com Post Maker", xpost_handler, {"content": "Testing Tappy skill system - this is a test post!"}),
        ("Google Calendar", google_calendar_handler, {
            "title": "Test Meeting",
            "date": "2025-01-15",
            "time": "14:00",
            "description": "This is a test event",
            "location": "Conference Room A",
            "duration_minutes": 60
        }),
        ("Amazon Add to Cart", amazon_cart_handler, {"product_query": "wireless headphones", "quantity": 1}),
        ("Save Gmail Draft", gmail_draft_handler, {
            "to": "test@example.com",
            "subject": "Test Email from Tappy",
            "body": "This is a test email draft."
        }),
    ]

    print("WORKING SKILLS (Reference):")
    print("-" * 70)
    for name, handler, params in working:
        print(f"  ✓ {name}")

    print(f"\n\nSKILLS TO TEST ({len(to_test)} total):")
    print("-" * 70)
    for i, (name, handler, params) in enumerate(to_test, 1):
        print(f"  {i}. {name}")

    print("\n\nStarting tests...")

    for name, handler, params in to_test:
        await test_skill(name, handler, params, api_key, profile_id)
        # Add delay between tests to avoid rate limiting
        await asyncio.sleep(2)

    print(f"\n{'='*70}")
    print("✓ Test suite completed!")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())
