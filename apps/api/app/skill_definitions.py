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
# REGISTRATION
# ============================================================================

def register_all_skills():
    """Register all available skills with the global registry."""
    # Register job search
    register_skill(job_search_config, job_search_handler)

    # Register other skills as they become available
    # register_skill(email_config, email_handler)
    # register_skill(research_config, research_handler)

    print(f"✓ Registered {len([job_search_config])} skill(s)")


# Auto-register on import
register_all_skills()
