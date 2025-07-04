import asyncio
import json
import httpx
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools import tool
from agno.utils import pprint
from rich.console import Console
from rich.prompt import Prompt
from config import create_azure_openai_model

import asyncio
import json
import httpx
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools import tool

@tool(requires_confirmation=True)
async def get_top_hackernews_stories(num_stories: int) -> str:
    """Fetch top stories from Hacker News."""
    async with httpx.AsyncClient() as client:
        response = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json")
        story_ids = response.json()
        
        all_stories = []
        for story_id in story_ids[:num_stories]:
            story_response = await client.get(
                f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
            )
            story = story_response.json()
            if "text" in story:
                story.pop("text", None)
            all_stories.append(story)
        return json.dumps(all_stories)

async def main():
    agent = Agent(
        model=create_azure_openai_model(),
        tools=[get_top_hackernews_stories],
        markdown=True,
    )

    # arun with stream=True returns an async generator
    async_gen = await agent.arun("Fetch the top 2 hackernews stories", stream=True)
    
    final_response = None
    async for response in async_gen:
        print(f"Streaming: {response.content}")
        final_response = response
        
        # Check if paused after each response
        if response.is_paused:
            # Handle confirmation logic here
            for tool in agent.run_response.tools_requiring_confirmation:
                print(f"Tool {tool.tool_name} requires confirmation")
                confirmed = input("Continue? (y/n): ").lower() == "y"
                tool.confirmed = confirmed
            
            # Continue the run
            continue_gen = await agent.acontinue_run(run_response=response, stream=True)
            async for continue_response in continue_gen:
                print(f"Continue streaming: {continue_response.content}")
                final_response = continue_response

asyncio.run(main())