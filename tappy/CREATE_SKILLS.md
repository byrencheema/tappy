# Creating Browser Use Skills

Skills are created on [Browser Use Cloud](https://cloud.browser-use.com/skills) and registered in the API.

## Current Skills

| Skill | ID | Type |
|-------|-----|------|
| Tech Job Search | `805c9a12-9d9d-4d64-8234-9d8b378cf6cf` | data_retrieval |
| HackerNews Top Posts | `962a620b-607b-4c08-a51f-0376f24c1938` | data_retrieval |
| Weather Forecast | `911880ed-b5a9-408e-803e-db1279585bab` | data_retrieval |
| News Search | `7ed94633-2162-4b78-a958-ba924b58c6e0` | data_retrieval |
| YouTube Search | `e6cec7da-4d28-4fc2-91e5-0f7cf4602196` | data_retrieval |
| X.com Post Maker | `eb6153e1-1e95-4e5b-88ac-5158c9207b9c` | action |
| Google Calendar | `20f63d34-afa9-4e18-b361-47edd270c3ca` | action |
| Amazon Add to Cart | `adbd36f2-a522-4f06-b458-946bd236ded2` | action |
| Save Gmail Draft | `27441e62-faaf-4c15-855a-f7bbb479bbf0` | action |

## Creating a New Skill

1. Go to [cloud.browser-use.com/skills](https://cloud.browser-use.com/skills)
2. Click "Create Skill" and use manual mode
3. Describe your automation goal in plain text
4. Wait for it to build and test
5. Copy the skill UUID

## Registering a Skill in the API

After creating a skill on Browser Use Cloud:

1. Add parameter schema to `apps/api/app/skills.py`
2. Add formatter and config to `apps/api/app/skill_definitions.py`
3. Add to `register_all_skills()` in `skill_definitions.py`
4. For action skills: add task description in `_build_task_description()`

See `apps/api/SKILLS.md` for detailed instructions.

## Skill Types

- **data_retrieval**: Fast (~1-3s), direct API call. No auth needed.
- **action**: Slower (~30-60s), uses browser session with profile cookies. Requires `BROWSER_USE_PROFILE_ID`.

## Profile Setup for Action Skills

Action skills (Gmail, X.com, Amazon) need an authenticated browser profile:

1. Go to [cloud.browser-use.com](https://cloud.browser-use.com)
2. Create a browser profile
3. Log into the sites you need (Gmail, X.com, etc.)
4. Copy the profile ID to `.env` as `BROWSER_USE_PROFILE_ID`

If cookies expire, open the profile and log in again to refresh them.
