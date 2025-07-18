import asyncio

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools, MultiMCPTools
from agno.tools.file import FileTools
from config import create_azure_openai_model

# This is the URL of the MCP server we want to use.
server_url = "http://localhost:8001/sse"


async def run_agent(message: str) -> None:
    async with MCPTools(transport="sse", url=server_url) as mcp_tools:
        agent = Agent(
            model=create_azure_openai_model(),
            tools=[mcp_tools, FileTools()],
            instructions=[
                "You are a helpful assistant.",
                "Answer the user's questions to the best of your ability.",
                "If you don't know the answer, say 'I don't know'.",
                "Use file tools to work on local directory.",
                "Use mcp tools to interact with azure blob storage."
            ],
            markdown=True,
        )
        await agent.aprint_response(message=message, stream=True, markdown=True)

async def main():
    # view all files in the pradeep-demo blob container
    await run_agent("What are the files stored in pradeep-demo blob container?")

    # create a document about Universe in markdown format, read file and upload that file content to the pradeep-demo blob container
    await run_agent(
        "Can you please create a document about Universe in markdown format, read file and upload that file content to the pradeep-demo blob container?"
    )

    await asyncio.sleep(20)

    # read the file content from universe.md from the pradeep-demo blob container
    await run_agent(
        "Can you please read the file content from universe.md from the pradeep-demo blob container?"
    )


if __name__ == "__main__":
    asyncio.run(main())
