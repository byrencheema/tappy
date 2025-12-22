"""
Skill definitions and formatters.

This file contains the configuration and formatting logic for all registered skills.
Add new skills here to make them available to the planner and executor.
"""

from typing import Any, Dict, List, Optional

from app.schemas import SkillExecutionResult
from app.skills import (
    BrowserUseSkillHandler,
    FormattedSkillResult,
    JobSearchParameters,
    HackerNewsParameters,
    WeatherParameters,
    NewsSearchParameters,
    XPostParameters,
    GoogleCalendarParameters,
    YouTubeSearchParameters,
    AmazonAddToCartParameters,
    SkillConfig,
    SkillStatus,
    SkillType,
    register_skill,
)


# ============================================================================
# JOB SEARCH SKILL
# ============================================================================

def format_job_search_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format job search results for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="💼 Job Search Failed",
            message=f"Unable to complete job search: {result.error}",
            status="pending"
        )

    # Extract jobs from Browser Use API response
    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="💼 Job Search - No Results",
                message="The search completed but returned no data.",
                status="pending"
            )

        result_data = output.get("result", {})

        # Check for API errors (rate limiting, etc.)
        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            error_code = error.get("code", "ERROR")
            return FormattedSkillResult(
                title="💼 Job Search Failed",
                message=f"{error_code}: {error_msg}",
                status="pending"
            )

        data = result_data.get("data", {})
        jobs = data.get("jobs", [])
        total_count = data.get("count", len(jobs))

        if not jobs:
            return FormattedSkillResult(
                title="💼 No Jobs Found",
                message="Try adjusting your search criteria or checking back later.",
                status="pending"
            )

        # Format top jobs (limit to 5 for display)
        top_jobs = jobs[:5]
        job_lines = []

        for idx, job in enumerate(top_jobs, 1):
            title = job.get("title", "Unknown Position")
            company = job.get("company", "Unknown Company")
            location = job.get("location", "Location not specified")
            salary = job.get("salary", "Salary not listed")

            job_lines.append(f"{idx}. {title} at {company}")
            job_lines.append(f"   📍 {location}")
            job_lines.append(f"   💰 {salary}")
            job_lines.append("")  # Blank line between jobs

        message = "\n".join(job_lines)

        # Add footer if more jobs available
        if total_count > 5:
            message += f"\n... and {total_count - 5} more jobs"

        return FormattedSkillResult(
            title=f"💼 Found {total_count} job{'s' if total_count != 1 else ''}",
            message=message,
            action="Browse Results",
            status="needs_confirmation"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="💼 Job Search - Format Error",
            message=f"Results received but couldn't be formatted: {str(e)}",
            status="pending"
        )


job_search_config = SkillConfig(
    id="805c9a12-9d9d-4d64-8234-9d8b378cf6cf",
    name="Tech Job Search",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Searches for tech jobs across multiple job boards",
    parameter_schema=JobSearchParameters,
    example_params={
        "query": "python engineer @location:San Francisco",
        "limit": 10
    },
    planner_hints=(
        "Trigger when journal reflects career frustration, job dissatisfaction, "
        "wanting a change, feeling stuck at work, considering new opportunities, "
        "or mentions specific roles/companies they admire. Look for emotional cues like "
        "'hate my job', 'need a change', 'thinking about leaving', 'wish I worked at'. "
        "Extract relevant skills, industries, or locations mentioned. "
        "Expand location abbreviations (SF→San Francisco, NYC→New York City, etc.)."
    )
)

job_search_handler = BrowserUseSkillHandler(
    config=job_search_config,
    formatter=format_job_search_result
)


# ============================================================================
# GMAIL DRAFT SKILL
# ============================================================================

from app.skills import EmailParameters


def format_gmail_draft_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format Gmail draft results."""
    if result.status == SkillStatus.FAILED:
        return FormattedSkillResult(
            title="📧 Draft Failed",
            message=f"Could not save draft: {result.error}",
            status="pending"
        )

    return FormattedSkillResult(
        title="📧 Draft Saved",
        message="Your email draft was saved to Gmail.",
        action="View Drafts",
        status="completed"
    )


gmail_draft_config = SkillConfig(
    id="27441e62-faaf-4c15-855a-f7bbb479bbf0",
    name="Save Gmail Draft",
    skill_type=SkillType.ACTION,
    description="Saves an email draft in Gmail with recipient, subject, and body",
    parameter_schema=EmailParameters,
    example_params={"to": "friend@example.com", "subject": "Quick update", "body": "Hey, just wanted to share..."},
    planner_hints=(
        "Trigger when journal mentions wanting to email someone, draft a message, "
        "write to someone, reach out via email, or compose an email. Look for cues like "
        "'should email', 'need to write to', 'send a message to', 'reach out to X about'. "
        "Extract the recipient, subject, and body from context. "
        "IMPORTANT: This is an ACTION skill - always require user confirmation before saving."
    )
)

gmail_draft_handler = BrowserUseSkillHandler(
    config=gmail_draft_config,
    formatter=format_gmail_draft_result
)


# ============================================================================
# RESEARCH SKILL (Example - Not implemented)
# ============================================================================

# from app.skills import ResearchParameters
#
# def format_research_result(result: SkillExecutionResult) -> FormattedSkillResult:
#     """Format research results."""
#     if result.status == SkillStatus.FAILED:
#         return FormattedSkillResult(
#             title="🔍 Research Failed",
#             message=f"Could not complete research: {result.error}",
#             status="pending"
#         )
#
#     # Extract findings from output
#     findings = result.output.get("findings", "No findings available")
#
#     return FormattedSkillResult(
#         title="🔍 Research Complete",
#         message=findings,
#         action="Read Full Report",
#         status="needs_confirmation"
#     )
#
# research_config = SkillConfig(
#     id="research-skill-uuid",
#     name="Web Research",
#     skill_type=SkillType.ANALYSIS,
#     description="Researches topics on the web and summarizes findings",
#     parameter_schema=ResearchParameters,
#     example_params={"topic": "AI trends 2025", "depth": "medium"},
#     planner_hints="Use when user asks to research, look up, investigate, or learn about a topic."
# )
#
# research_handler = BrowserUseSkillHandler(config=research_config, formatter=format_research_result)


# ============================================================================
# HACKERNEWS TOP POSTS SKILL
# ============================================================================

def format_hackernews_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format HackerNews top posts for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="🔶 HackerNews Fetch Failed",
            message=f"Unable to fetch posts: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="🔶 HackerNews - No Results",
                message="The fetch completed but returned no data.",
                status="pending"
            )

        # Parse response - handle different structures
        result_data = output.get("result", {})

        # Check for API errors (rate limiting, etc.)
        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            error_code = error.get("code", "ERROR")
            return FormattedSkillResult(
                title="🔶 HackerNews Fetch Failed",
                message=f"{error_code}: {error_msg}",
                status="pending"
            )

        data = result_data.get("data", {})
        posts = data.get("posts", [])

        if not posts:
            return FormattedSkillResult(
                title="🔶 No Posts Found",
                message="Unable to fetch HackerNews posts at this time.",
                status="pending"
            )

        # Format top posts (limit to 8 for display)
        top_posts = posts[:8]
        post_lines = []

        for idx, post in enumerate(top_posts, 1):
            title = post.get("title", "Untitled")
            score = post.get("score", 0)
            comments = post.get("comments_count", 0)

            post_lines.append(f"{idx}. {title}")
            post_lines.append(f"   ⬆️  {score} points | 💬 {comments} comments")
            post_lines.append("")

        message = "\n".join(post_lines)

        return FormattedSkillResult(
            title=f"🔶 Top {len(top_posts)} HackerNews Posts",
            message=message,
            action="Read on HN",
            status="needs_confirmation"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="🔶 HackerNews - Format Error",
            message=f"Results received but couldn't be formatted: {str(e)}",
            status="pending"
        )


hackernews_config = SkillConfig(
    id="962a620b-607b-4c08-a51f-0376f24c1938",
    name="HackerNews Top Posts",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Fetches top posts from HackerNews",
    parameter_schema=HackerNewsParameters,
    example_params={"limit": 10},
    planner_hints=(
        "Trigger when journal mentions feeling out of the loop on tech, curiosity about "
        "what developers are talking about, wanting to stay current, or reflects on "
        "tech industry trends. Look for cues like 'wonder what's new in tech', "
        "'feel behind on trends', 'curious what other devs think about'."
    )
)

hackernews_handler = BrowserUseSkillHandler(
    config=hackernews_config,
    formatter=format_hackernews_result
)


# ============================================================================
# WEATHER FORECAST SKILL
# ============================================================================

def format_weather_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format weather forecast for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="🌤️ Weather Forecast Failed",
            message=f"Unable to fetch weather: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="🌤️ Weather - No Results",
                message="The forecast fetch completed but returned no data.",
                status="pending"
            )

        # Parse nested structure: result.data contains the actual weather data
        result_data = output.get("result", {})

        # Check for API errors (rate limiting, etc.)
        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            error_code = error.get("code", "ERROR")
            return FormattedSkillResult(
                title="🌤️ Weather Forecast Failed",
                message=f"{error_code}: {error_msg}",
                status="pending"
            )

        data = result_data.get("data", {})
        location = data.get("location", "Unknown location")
        forecasts = data.get("forecast", [])
        current = data.get("current", {})

        if not forecasts:
            return FormattedSkillResult(
                title="🌤️ No Forecast Available",
                message=f"Unable to fetch weather for {location}.",
                status="pending"
            )

        # Format forecast
        forecast_lines = [f"📍 {location}", ""]

        # Add current conditions if available
        if current:
            temp = current.get("temperature", "?")
            conditions = current.get("conditions", "Unknown")
            forecast_lines.append(f"Now: {temp}° - {conditions}")
            forecast_lines.append("")

        # Add daily forecasts
        for day in forecasts[:5]:  # Limit to 5 days
            day_name = day.get("day", "Unknown")
            date = day.get("date", "")
            high = day.get("high", "?")
            low = day.get("low", "?")
            narrative = day.get("narrative", "")

            forecast_lines.append(f"{day_name} ({date})")
            forecast_lines.append(f"  High: {high}° | Low: {low}°")
            if narrative:
                forecast_lines.append(f"  {narrative}")
            forecast_lines.append("")

        message = "\n".join(forecast_lines)

        return FormattedSkillResult(
            title=f"🌤️ Weather for {location}",
            message=message,
            action="View Full Forecast",
            status="needs_confirmation"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="🌤️ Weather - Format Error",
            message=f"Results received but couldn't be formatted: {str(e)}",
            status="pending"
        )


weather_config = SkillConfig(
    id="911880ed-b5a9-408e-803e-db1279585bab",
    name="Weather Forecast",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Fetches weather forecast for a location",
    parameter_schema=WeatherParameters,
    example_params={"location": "San Francisco", "days": 3, "units": "e"},
    planner_hints=(
        "Trigger when journal mentions planning outdoor activities, upcoming trips, "
        "wondering what to wear, hoping for good weather, or concerns about rain/storms. "
        "Look for cues like 'planning a hike', 'going to the beach', 'hope it doesn't rain', "
        "'packing for my trip to', 'weekend plans'. Extract the location from context. "
        "Expand abbreviations (SF→San Francisco, NYC→New York City, LA→Los Angeles, etc.)."
    )
)

weather_handler = BrowserUseSkillHandler(
    config=weather_config,
    formatter=format_weather_result
)


# ============================================================================
# NEWS SEARCH SKILL
# ============================================================================

def format_news_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format news search results for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="📰 News Search Failed",
            message=f"Unable to search news: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="📰 News - No Results",
                message="The search completed but returned no data.",
                status="pending"
            )

        # Parse nested structure: result.data contains the actual news data
        result_data = output.get("result", {})

        # Check for API errors (rate limiting, etc.)
        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            error_code = error.get("code", "ERROR")
            return FormattedSkillResult(
                title="📰 News Search Failed",
                message=f"{error_code}: {error_msg}",
                status="pending"
            )

        data = result_data.get("data", {})
        articles = data.get("articles", [])

        if not articles:
            return FormattedSkillResult(
                title="📰 No Articles Found",
                message="No news articles found. Try a different search.",
                status="pending"
            )

        # Format articles (limit to 6 for display)
        top_articles = articles[:6]
        article_lines = []

        for idx, article in enumerate(top_articles, 1):
            title = article.get("title", "Untitled Article")
            source = article.get("source", "Unknown Source")
            snippet = article.get("snippet", "")

            article_lines.append(f"{idx}. {title}")
            article_lines.append(f"   📌 {source}")
            if snippet:
                # Truncate snippet to 100 chars
                short_snippet = snippet[:100] + "..." if len(snippet) > 100 else snippet
                article_lines.append(f"   {short_snippet}")
            article_lines.append("")

        message = "\n".join(article_lines)

        return FormattedSkillResult(
            title=f"📰 Found {len(articles)} article{'s' if len(articles) != 1 else ''}",
            message=message,
            action="Read Articles",
            status="needs_confirmation"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="📰 News - Format Error",
            message=f"Results received but couldn't be formatted: {str(e)}",
            status="pending"
        )


news_config = SkillConfig(
    id="7ed94633-2162-4b78-a958-ba924b58c6e0",
    name="News Search",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Searches for news articles on any topic",
    parameter_schema=NewsSearchParameters,
    example_params={"query": "AI developments", "max_results": 5},
    planner_hints=(
        "Trigger when journal reflects curiosity about current events, wondering what's happening "
        "with a topic/company/industry, feeling uninformed, or mentions something they heard about. "
        "Look for cues like 'wonder what X is up to', 'heard something about', 'curious about', "
        "'want to catch up on', 'what's happening with'. Extract the topic of interest."
    )
)

news_handler = BrowserUseSkillHandler(
    config=news_config,
    formatter=format_news_result
)


# ============================================================================
# X.COM POST MAKER SKILL
# ============================================================================

def format_xpost_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format X.com post result for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="𝕏 Post Failed",
            message=f"Unable to post: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="𝕏 Post - Unknown Status",
                message="The post may have been sent but we couldn't confirm.",
                status="pending"
            )

        result_data = output.get("result", {})

        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            return FormattedSkillResult(
                title="𝕏 Post Failed",
                message=error_msg,
                status="pending"
            )

        data = result_data.get("data", {})
        post_url = data.get("url", "")
        posted_content = data.get("content", "Your post")

        message = f"Posted: \"{posted_content[:100]}{'...' if len(posted_content) > 100 else ''}\""
        if post_url:
            message += f"\n\n🔗 {post_url}"

        return FormattedSkillResult(
            title="𝕏 Posted Successfully",
            message=message,
            action="View Post",
            status="completed"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="𝕏 Post - Format Error",
            message=f"Action completed but couldn't format result: {str(e)}",
            status="pending"
        )


xpost_config = SkillConfig(
    id="eb6153e1-1e95-4e5b-88ac-5158c9207b9c",
    name="X.com Post Maker",
    skill_type=SkillType.ACTION,
    description="Posts content to X.com (Twitter) on your behalf",
    parameter_schema=XPostParameters,
    example_params={"content": "Just had a great insight about..."},
    planner_hints=(
        "Trigger when journal reflects a desire to share publicly, post more, take action, "
        "be more visible, or contains a thought worth sharing. Look for cues like "
        "'I should post this', 'want to share', 'hot take', 'need to put myself out there', "
        "'should be more active online', 'this would make a good tweet'. "
        "Extract the core insight or thought and craft it into a concise post. "
        "IMPORTANT: This is an ACTION skill - always require user confirmation before posting."
    )
)

xpost_handler = BrowserUseSkillHandler(
    config=xpost_config,
    formatter=format_xpost_result
)


# ============================================================================
# GOOGLE CALENDAR SKILL
# ============================================================================

def format_google_calendar_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format Google Calendar event creation result for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="📅 Calendar Event Failed",
            message=f"Unable to create event: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="📅 Calendar Event - Unknown Status",
                message="The event may have been created but we couldn't confirm.",
                status="pending"
            )

        result_data = output.get("result", {})

        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            return FormattedSkillResult(
                title="📅 Calendar Event Failed",
                message=error_msg,
                status="pending"
            )

        data = result_data.get("data", {})
        event_title = data.get("title", "Your event")
        event_date = data.get("date", "")
        event_time = data.get("time", "")
        event_url = data.get("url", "")
        output_text = data.get("output", "")

        # Check if it's a template link
        is_template = "action=TEMPLATE" in output_text or "calendar/render" in output_text

        if is_template:
            # Extract URL from output text
            import re
            url_match = re.search(r'https://calendar\.google\.com/[^\s]+', output_text)
            template_url = url_match.group(0) if url_match else ""

            message = "Event details ready - click to add to your calendar"
            if template_url:
                message += f"\n\n🔗 {template_url}"

            return FormattedSkillResult(
                title="📅 Calendar Event Ready",
                message=message,
                action="Add to Calendar",
                status="needs_confirmation"
            )

        message = f"Created: \"{event_title}\""
        if event_date and event_time:
            message += f"\n📆 {event_date} at {event_time}"
        if event_url:
            message += f"\n\n🔗 {event_url}"

        return FormattedSkillResult(
            title="📅 Event Created Successfully",
            message=message,
            action="View Calendar",
            status="completed"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="📅 Calendar - Format Error",
            message=f"Action completed but couldn't format result: {str(e)}",
            status="pending"
        )


google_calendar_config = SkillConfig(
    id="20f63d34-afa9-4e18-b361-47edd270c3ca",
    name="Google Calendar",
    skill_type=SkillType.ACTION,
    description="Creates calendar events with title, date/time, description, and location",
    parameter_schema=GoogleCalendarParameters,
    example_params={
        "title": "Team Meeting",
        "date": "2025-01-15",
        "time": "14:00",
        "description": "Weekly sync",
        "location": "Conference Room A",
        "duration_minutes": 60
    },
    planner_hints=(
        "Trigger when journal mentions scheduling, planning meetings, setting reminders, "
        "appointments, or time-based commitments. Look for cues like 'need to schedule', "
        "'should set up a meeting', 'don't forget to', 'remind me to', 'at X o'clock', "
        "'on Monday', 'next week'. Extract the event details from context. "
        "IMPORTANT: This is an ACTION skill - always require user confirmation before creating."
    )
)

google_calendar_handler = BrowserUseSkillHandler(
    config=google_calendar_config,
    formatter=format_google_calendar_result
)


# ============================================================================
# YOUTUBE SEARCH SKILL
# ============================================================================

def format_youtube_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format YouTube search results for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="▶️ YouTube Search Failed",
            message=f"Unable to search: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="▶️ YouTube - No Results",
                message="The search completed but returned no data.",
                status="pending"
            )

        result_data = output.get("result", {})

        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            error_code = error.get("code", "ERROR")
            return FormattedSkillResult(
                title="▶️ YouTube Search Failed",
                message=f"{error_code}: {error_msg}",
                status="pending"
            )

        data = result_data.get("data", {})
        videos = data.get("results", []) or data.get("videos", [])

        if not videos:
            return FormattedSkillResult(
                title="▶️ No Videos Found",
                message="No YouTube videos found. Try a different search.",
                status="pending"
            )

        top_videos = videos[:6]
        video_lines = []

        for idx, video in enumerate(top_videos, 1):
            title = video.get("title", "Untitled Video")
            channel = video.get("channel", "Unknown Channel")
            views = video.get("view_count", video.get("views", "Unknown views"))

            video_lines.append(f"{idx}. {title}")
            video_lines.append(f"   📺 {channel}")
            video_lines.append(f"   👁️  {views}")
            video_lines.append("")

        message = "\n".join(video_lines)

        return FormattedSkillResult(
            title=f"▶️ Found {len(videos)} video{'s' if len(videos) != 1 else ''}",
            message=message,
            action="Watch Videos",
            status="needs_confirmation"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="▶️ YouTube - Format Error",
            message=f"Results received but couldn't be formatted: {str(e)}",
            status="pending"
        )


youtube_search_config = SkillConfig(
    id="e6cec7da-4d28-4fc2-91e5-0f7cf4602196",
    name="YouTube Search",
    skill_type=SkillType.DATA_RETRIEVAL,
    description="Searches YouTube and extracts video titles, channels, and view counts",
    parameter_schema=YouTubeSearchParameters,
    example_params={"query": "Python tutorials", "max_results": 10},
    planner_hints=(
        "Trigger when journal mentions wanting to learn something via video, tutorials, "
        "how-to content, entertainment, or visual explanations. Look for cues like "
        "'want to watch', 'need a tutorial on', 'looking for videos about', "
        "'should learn how to', 'need to see how'. Extract the search topic from context."
    )
)

youtube_search_handler = BrowserUseSkillHandler(
    config=youtube_search_config,
    formatter=format_youtube_result
)


# ============================================================================
# AMAZON ADD TO CART SKILL
# ============================================================================

def format_amazon_cart_result(result: SkillExecutionResult) -> FormattedSkillResult:
    """Format Amazon add to cart result for inbox display."""

    if result.status == SkillStatus.FAILED.value:
        return FormattedSkillResult(
            title="🛒 Amazon Cart Failed",
            message=f"Unable to add to cart: {result.error}",
            status="pending"
        )

    try:
        output = result.output
        if not output or "result" not in output:
            return FormattedSkillResult(
                title="🛒 Amazon Cart - Unknown Status",
                message="The item may have been added but we couldn't confirm.",
                status="pending"
            )

        result_data = output.get("result", {})

        if not result_data.get("success", True):
            error = result_data.get("error", {})
            error_msg = error.get("message", "Unknown error")
            return FormattedSkillResult(
                title="🛒 Amazon Cart Failed",
                message=error_msg,
                status="pending"
            )

        data = result_data.get("data", {})
        product_name = data.get("product_name", "Your item")
        price = data.get("price", "")
        quantity = data.get("quantity", 1)
        cart_url = data.get("cart_url", "")

        message = f"Added: \"{product_name}\""
        if quantity > 1:
            message += f" (x{quantity})"
        if price:
            message += f"\n💰 {price}"
        if cart_url:
            message += f"\n\n🔗 {cart_url}"

        return FormattedSkillResult(
            title="🛒 Added to Amazon Cart",
            message=message,
            action="View Cart",
            status="completed"
        )

    except Exception as e:
        return FormattedSkillResult(
            title="🛒 Amazon - Format Error",
            message=f"Action completed but couldn't format result: {str(e)}",
            status="pending"
        )


amazon_cart_config = SkillConfig(
    id="adbd36f2-a522-4f06-b458-946bd236ded2",
    name="Amazon Add to Cart",
    skill_type=SkillType.ACTION,
    description="Searches for products on Amazon and adds them to your cart",
    parameter_schema=AmazonAddToCartParameters,
    example_params={"product_query": "wireless headphones", "quantity": 1},
    planner_hints=(
        "Trigger when journal mentions needing to buy something, shopping for items, "
        "running low on supplies, or wanting to purchase. Look for cues like "
        "'need to buy', 'should order', 'running out of', 'want to get', "
        "'looking for a new', 'add to my cart'. Extract the product from context. "
        "IMPORTANT: This is an ACTION skill - always require user confirmation before adding."
    )
)

amazon_cart_handler = BrowserUseSkillHandler(
    config=amazon_cart_config,
    formatter=format_amazon_cart_result
)


# ============================================================================
# REGISTRATION
# ============================================================================

def register_all_skills():
    """Register all available skills with the global registry."""
    skills_to_register = [
        (job_search_config, job_search_handler),
        (hackernews_config, hackernews_handler),
        (weather_config, weather_handler),
        (news_config, news_handler),
        (xpost_config, xpost_handler),
        (google_calendar_config, google_calendar_handler),
        (youtube_search_config, youtube_search_handler),
        (amazon_cart_config, amazon_cart_handler),
        (gmail_draft_config, gmail_draft_handler),
    ]

    for config, handler in skills_to_register:
        register_skill(config, handler)

    print(f"✓ Registered {len(skills_to_register)} skill(s)")


# Auto-register on import
register_all_skills()
