#!/usr/bin/env python3
"""Script to create skills via Browser Use Cloud API."""

import argparse
import asyncio
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("BROWSER_USE_API_KEY")
API_URL = os.getenv("BROWSER_USE_API_URL", "https://api.browser-use.com/api/v2")

SKILL_TEMPLATES = {
    "gmail-draft": {
        "agent_prompt": "Go to Gmail (mail.google.com), click compose, fill in the To field with the recipient email, fill in the Subject field, fill in the email body, then click the X to close (saving as draft). Do NOT send the email.",
        "goal": "Save an email draft in Gmail to a specified recipient with subject and body content",
    },
    "google-calendar": {
        "agent_prompt": "Go to Google Calendar (calendar.google.com), click to create a new event, fill in the event title, date, time, and optionally description and location, then save the event.",
        "goal": "Create a new event on Google Calendar with specified details",
    },
    "linkedin-message": {
        "agent_prompt": "Go to LinkedIn (linkedin.com), search for the specified person by name, navigate to their profile, click the Message button, compose and send the message.",
        "goal": "Send a direct message to a LinkedIn connection",
    },
    "youtube-search": {
        "agent_prompt": "Go to YouTube (youtube.com), search for videos matching the query, extract video titles, channels, view counts, and durations from the search results.",
        "goal": "Search YouTube and extract video information from results",
    },
    "reddit-search": {
        "agent_prompt": "Go to Reddit (reddit.com), search for posts matching the query (optionally within a specific subreddit), extract post titles, subreddits, upvotes, and comment counts.",
        "goal": "Search Reddit for posts and extract post information",
    },
}


async def create_skill(agent_prompt: str, goal: str) -> dict:
    """Create a new skill via Browser Use API."""
    headers = {
        "Content-Type": "application/json",
        "X-Browser-Use-API-Key": API_KEY,
    }
    payload = {
        "agentPrompt": agent_prompt,
        "goal": goal,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{API_URL}/skills", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


async def get_skill(skill_id: str) -> dict:
    """Get skill status."""
    headers = {"X-Browser-Use-API-Key": API_KEY}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{API_URL}/skills/{skill_id}", headers=headers)
        response.raise_for_status()
        return response.json()


async def wait_for_skill(skill_id: str) -> dict:
    """Poll until skill is finished."""
    print(f"Waiting for skill {skill_id} to finish...")

    while True:
        skill_status = await get_skill(skill_id)
        status = skill_status.get("status", "unknown")
        print(f"  Status: {status}")

        if status == "finished":
            return skill_status
        elif status == "failed":
            raise Exception(f"Skill creation failed: {skill_status}")

        await asyncio.sleep(2)


async def run_create(args):
    """Create a skill from template or custom prompt."""
    if args.template:
        if args.template not in SKILL_TEMPLATES:
            print(f"Unknown template: {args.template}")
            print(f"Available: {', '.join(SKILL_TEMPLATES.keys())}")
            return
        template = SKILL_TEMPLATES[args.template]
        agent_prompt = template["agent_prompt"]
        goal = template["goal"]
        print(f"Creating skill from template: {args.template}")
    else:
        if not args.prompt or not args.goal:
            print("Error: --prompt and --goal required for custom skills")
            return
        agent_prompt = args.prompt
        goal = args.goal
        print("Creating custom skill...")

    print(f"Goal: {goal}\n")

    skill_response = await create_skill(agent_prompt, goal)
    skill_id = skill_response.get("id")
    print(f"Skill ID: {skill_id}")

    if args.wait:
        final_status = await wait_for_skill(skill_id)
        print("\nSkill finished!")
        print(f"Parameters: {json.dumps(final_status.get('parameters'), indent=2)}")
        print(f"Output schema: {final_status.get('output_schema')}")


async def run_status(args):
    """Check status of a skill."""
    skill_status = await get_skill(args.skill_id)
    print(json.dumps(skill_status, indent=2))


async def run_list(_args):
    """List available templates."""
    print("Available skill templates:\n")
    for name, template in SKILL_TEMPLATES.items():
        print(f"  {name}")
        print(f"    Goal: {template['goal']}\n")


def main():
    if not API_KEY:
        print("Error: BROWSER_USE_API_KEY not set in .env")
        return

    parser = argparse.ArgumentParser(description="Create Browser Use skills")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create a new skill")
    create_parser.add_argument("-t", "--template", help="Use a predefined template")
    create_parser.add_argument("-p", "--prompt", help="Custom agent prompt")
    create_parser.add_argument("-g", "--goal", help="Custom goal description")
    create_parser.add_argument("-w", "--wait", action="store_true", help="Wait for completion")

    status_parser = subparsers.add_parser("status", help="Check skill status")
    status_parser.add_argument("skill_id", help="Skill ID to check")

    subparsers.add_parser("list", help="List available templates")

    args = parser.parse_args()

    if args.command == "create":
        asyncio.run(run_create(args))
    elif args.command == "status":
        asyncio.run(run_status(args))
    elif args.command == "list":
        asyncio.run(run_list(args))


if __name__ == "__main__":
    main()
