import asyncio
from pydantic import BaseModel
from typing import Optional

class UserInputRequest:
    def __init__(self, fields):
        self.fields = fields  # List of dicts: {name, description, type, value}
        self.event = asyncio.Event()
        self.values = None

class SessionTask:
    def __init__(self, user_query: str = "Who is the current president of the United States?"):
        self.cancel_event = asyncio.Event()
        self.confirm_event = asyncio.Event()
        self.confirmed = None
        self.input_request = None  # For dynamic user input
        self.websocket_ready = asyncio.Event()  # Ensure WebSocket is connected before starting
        self.task_started = asyncio.Event()  # Track if background task has started
        self.connection_count = 0  # Track reconnections
        self.user_query = user_query  # Store the user's query

class StartTaskRequest(BaseModel):
    query: str