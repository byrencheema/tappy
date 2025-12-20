"""
Test script for Browser Use Skills integration.

Run this to validate that skills are properly configured and can execute.
"""

import asyncio
import json
import os
from pathlib import Path

# Add app to path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from app.skills import get_registry, SkillStatus
from app.skill_definitions import *  # Auto-registers skills


async def test_registry():
    """Test that skills are registered correctly."""
    print("=" * 60)
    print("Testing Skill Registry")
    print("=" * 60)

    registry = get_registry()
    skills = registry.list_skills()

    print(f"\n✓ Found {len(skills)} registered skill(s):\n")

    for skill in skills:
        print(f"  • {skill.name} ({skill.id})")
        print(f"    Type: {skill.skill_type.value}")
        print(f"    Description: {skill.description}")
        print(f"    Parameters: {skill.parameter_schema.__name__}")
        print()

    return len(skills) > 0


async def test_planner_context():
    """Test that planner context is generated correctly."""
    print("=" * 60)
    print("Testing Planner Context Generation")
    print("=" * 60)

    registry = get_registry()
    context = registry.get_planner_context()

    print("\nGenerated context for LLM:\n")
    print(context)
    print()

    return "Available skills:" in context


async def test_skill_execution_mock():
    """Test skill execution with mock data (test mode)."""
    print("=" * 60)
    print("Testing Skill Execution (Mock Mode)")
    print("=" * 60)

    # Enable test mode
    os.environ["SKILLS_TEST_MODE"] = "true"

    registry = get_registry()

    # Test job search skill
    job_skill = registry.get_config("805c9a12-9d9d-4d64-8234-9d8b378cf6cf")
    if job_skill:
        print(f"\n✓ Testing: {job_skill.name}")

        handler = registry.get_handler(job_skill.id)
        if handler:
            # Create test parameters
            params = job_skill.parameter_schema(
                query="python engineer @location:San Francisco",
                limit=5
            )

            # Execute skill
            result = await handler.execute(params, "test-api-key")

            print(f"  Status: {result.status}")
            print(f"  Skill ID: {result.skill_id}")
            print(f"  Output: {json.dumps(result.output, indent=2)[:200]}...")

            # Test formatting
            formatted = handler.format_result(result)
            print(f"\n  Formatted for inbox:")
            print(f"    Title: {formatted.title}")
            print(f"    Message preview: {formatted.message[:100]}...")
            print(f"    Action: {formatted.action}")
            print(f"    Status: {formatted.status}")

            return result.status == SkillStatus.COMPLETED.value

    return False


async def test_parameter_validation():
    """Test that parameter validation works."""
    print("=" * 60)
    print("Testing Parameter Validation")
    print("=" * 60)

    registry = get_registry()
    skills = registry.list_skills()

    success = True

    for skill in skills:
        print(f"\n✓ Testing parameters for: {skill.name}")

        try:
            # Try to create with example params
            params = skill.parameter_schema(**skill.example_params)
            print(f"  Valid params: {params.model_dump()}")

            # Try invalid params (should fail)
            try:
                if hasattr(skill.parameter_schema, "limit"):
                    bad_params = skill.parameter_schema(limit=9999)  # Over max
                    print("  ⚠️  Validation should have failed for limit=9999")
                    success = False
            except Exception as e:
                print(f"  ✓ Correctly rejected invalid params: {type(e).__name__}")

        except Exception as e:
            print(f"  ✗ Failed to create params: {e}")
            success = False

    return success


async def main():
    """Run all tests."""
    print("\n🧪 Browser Use Skills Integration Tests\n")

    tests = [
        ("Registry", test_registry),
        ("Planner Context", test_planner_context),
        ("Skill Execution (Mock)", test_skill_execution_mock),
        ("Parameter Validation", test_parameter_validation),
    ]

    results = []

    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ Test failed with exception: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)

    print(f"\nPassed: {passed}/{total}")

    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
