import asyncio
from pydantic import BaseModel
from typing import Optional

class UserInputRequest:
    def __init__(self, fields):
        self.fields = fields  # List of dicts: {name, description, type, value}
        self.event = asyncio.Event()
        self.values = None

class SessionTask:
    """
    Represents a session task with user query and state management.
    This class is used to manage the state of a task, including user confirmation,
    dynamic input requests, and WebSocket connection readiness.
    """
    def __init__(self, user_query: str):
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