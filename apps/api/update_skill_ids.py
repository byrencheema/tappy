"""
Simple script to update skill IDs in skill_definitions.py

Usage:
    python update_skill_ids.py --hackernews=<id> --weather=<id> --news=<id>

Or edit the SKILL_IDS dict below and run:
    python update_skill_ids.py
"""

import argparse
from pathlib import Path

# Edit these with your real skill IDs from Browser Use Cloud
SKILL_IDS = {
    "placeholder-hackernews-uuid": None,  # Replace with real ID
    "placeholder-weather-uuid": None,     # Replace with real ID
    "placeholder-news-uuid": None,        # Replace with real ID
}


def update_skill_definitions(skill_mapping):
    """Update skill_definitions.py with real skill IDs."""
    skill_def_path = Path(__file__).parent / "app" / "skill_definitions.py"

    with open(skill_def_path, "r") as f:
        content = f.read()

    original_content = content
    updates = 0

    for placeholder, real_id in skill_mapping.items():
        if real_id:
            print(f"Replacing {placeholder} with {real_id}")
            content = content.replace(f'"{placeholder}"', f'"{real_id}"')
            updates += 1

    if content != original_content:
        with open(skill_def_path, "w") as f:
            f.write(content)
        print(f"\n✓ Updated {updates} skill ID(s) in skill_definitions.py")
    else:
        print("\n⚠️  No changes made - no valid skill IDs provided")


def main():
    parser = argparse.ArgumentParser(description="Update skill IDs in skill_definitions.py")
    parser.add_argument("--hackernews", help="HackerNews skill ID")
    parser.add_argument("--weather", help="Weather skill ID")
    parser.add_argument("--news", help="News skill ID")

    args = parser.parse_args()

    skill_mapping = SKILL_IDS.copy()

    # Override with command-line args if provided
    if args.hackernews:
        skill_mapping["placeholder-hackernews-uuid"] = args.hackernews
    if args.weather:
        skill_mapping["placeholder-weather-uuid"] = args.weather
    if args.news:
        skill_mapping["placeholder-news-uuid"] = args.news

    # Filter out None values
    skill_mapping = {k: v for k, v in skill_mapping.items() if v}

    if not skill_mapping:
        print("=" * 60)
        print("No skill IDs provided!")
        print("=" * 60)
        print("\nOption 1: Edit this file and set SKILL_IDS at the top")
        print("Option 2: Use command-line args:")
        print("  python update_skill_ids.py --hackernews=<id> --weather=<id> --news=<id>")
        print("\nTo create skills:")
        print("  1. Go to https://cloud.browser-use.com/skills")
        print("  2. Click 'Create Skill'")
        print("  3. Use these prompts:")
        print("     - HackerNews: 'Extract top posts from HackerNews'")
        print("     - Weather: 'Get weather forecast for a location'")
        print("     - News: 'Search for news articles on a topic'")
        print("  4. Copy the skill UUIDs")
        print("  5. Run this script with the IDs")
        return

    update_skill_definitions(skill_mapping)


if __name__ == "__main__":
    main()
