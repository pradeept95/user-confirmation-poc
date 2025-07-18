from typing import Iterator
from agno.tools import FunctionCall, tool
import httpx
import json
from task.task_manager import request_user_input
from service.session_manager import SessionManagerFactory

session_manager = SessionManagerFactory.get_instance()

@tool()
def get_top_hackernews_stories(num_stories: int) -> Iterator[str]:
    """Fetch top stories from Hacker News.

    Args:
        num_stories (int): Number of stories to retrieve

    Returns:
        str: JSON string containing story details
    """
    # Fetch top story IDs
    response = httpx.get("https://hacker-news.firebaseio.com/v0/topstories.json")
    story_ids = response.json()

    # Yield story details
    final_stories = []
    for story_id in story_ids[:num_stories]:
        story_response = httpx.get(
            f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
        )
        story = story_response.json()
        if "text" in story:
            story.pop("text", None)
        final_stories.append(story)

    return json.dumps(final_stories)


async def get_user_input(session_id: str, fields: list[dict]) -> str:
    """If agent needs to ask the user for input, this function can be used. You can specify the multiple fields to request from the user.
    Example fields format:
        ```python
        fields = [
            {"name": "subject", "description": "Subject of the email", "type": "string", "value": None},
            {"name": "body", "description": "Body of the email", "type": "string", "value": None},
            {"name": "to_address", "description": "Recipient email address", "type": "string", "value": None},
        ]
    This function will block until the user provides input or cancels the request.
    It will then return the user response as a JSON string.

    example usage:
        user_input = get_user_input(session_id, fields) 

    Args:
        session_id (str): The session ID for the current running task
        fields (list[dict]): The fields to request from the user

    Returns:
        str: user response or None if cancelled
    """
    print(f"Requesting user input for session {session_id} with fields: {fields}")
    await request_user_input(session_id, fields)
    task = session_manager.get_task(session_id)
    if not task.input_request or not task.input_request.values:
        print(f"Task {session_id} cancelled or no input.")
        return

    print(f"Task {session_id} received input: {task.input_request.values}")

    # return user input as JSON string
    return json.dumps(task.input_request.values)
 