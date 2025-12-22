"""
Opens a browser session with your profile so you can log into X.com.
Cookies will be saved to your Browser Use profile automatically.
"""

import asyncio
from browser_use import Browser, Agent, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

async def main():
    browser = Browser(
        headless=False,
        cloud_profile_id="bfeaa080-88e3-4a82-bf70-a5222429dc3d",
    )

    agent = Agent(
        task="Go to x.com and wait for the user to log in. Once logged in, confirm by saying 'Login complete'.",
        llm=ChatBrowserUse(),
        browser=browser,
    )

    print("Browser opening... Log into X.com manually.")
    print("Once logged in, the agent will detect it and save cookies.")

    await agent.run(max_steps=50)
    print("Cookies saved to profile!")

if __name__ == "__main__":
    asyncio.run(main())
