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

        data = output.get("result", {}).get("data", {})
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
        "Use when user mentions: job search, finding jobs, career opportunities, "
        "hiring, positions, roles, employment. Extract keywords, company names "
        "(prefix with @company:), and locations (prefix with @location:)."
    )
)

job_search_handler = BrowserUseSkillHandler(
    config=job_search_config,
    formatter=format_job_search_result
)


# ============================================================================
# EMAIL SKILL (Example - Not implemented)
# ============================================================================

# Uncomment and implement when email skill is available
# from app.skills import EmailParameters
#
# def format_email_result(result: SkillExecutionResult) -> FormattedSkillResult:
#     """Format email sending results."""
#     if result.status == SkillStatus.FAILED:
#         return FormattedSkillResult(
#             title="📧 Email Failed",
#             message=f"Could not send email: {result.error}",
#             status="pending"
#         )
#
#     return FormattedSkillResult(
#         title="📧 Email Sent",
#         message=f"Your email was sent successfully.",
#         action="View Sent",
#         status="completed"
#     )
#
# email_config = SkillConfig(
#     id="email-skill-uuid",
#     name="Send Email",
#     skill_type=SkillType.ACTION,
#     description="Sends emails on your behalf",
#     parameter_schema=EmailParameters,
#     example_params={"to": "example@example.com", "subject": "Hello", "body": "..."},
#     planner_hints="Use when user wants to send an email, message someone, or reach out."
# )
#
# email_handler = BrowserUseSkillHandler(config=email_config, formatter=format_email_result)


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
        data = output.get("result", {})
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
        "Use when user wants to see: HackerNews posts, tech news, trending tech discussions, "
        "what's popular on HN, tech community news."
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

        data = output.get("result", {})
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
        "Use when user mentions: weather, forecast, temperature, rain, snow, "
        "planning trips, what to wear, outdoor activities."
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

        data = output.get("result", {})
        articles = data.get("articles", [])
        query = data.get("query", "your topic")

        if not articles:
            return FormattedSkillResult(
                title="📰 No Articles Found",
                message=f"No news articles found for '{query}'.",
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
        "Use when user wants: news, articles, updates, latest on a topic, "
        "current events, headlines, breaking news."
    )
)

news_handler = BrowserUseSkillHandler(
    config=news_config,
    formatter=format_news_result
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
    ]

    for config, handler in skills_to_register:
        register_skill(config, handler)

    print(f"✓ Registered {len(skills_to_register)} skill(s)")


# Auto-register on import
register_all_skills()
