import asyncio

from fastapi import BackgroundTasks
from models.types import UserInputRequest
from service.session_manager import SessionManagerFactory
from service.websocket_manager import WebSocketManagerFactory

session_manager = SessionManagerFactory.get_instance()
ws_manager = WebSocketManagerFactory.get_instance()

async def wait_for_connection_and_start_task(task_info: dict):
    """Wait for WebSocket connection to be established before starting the actual task."""
    session_id = task_info.get("session_id")
    callback_fn = task_info.get("callback_fn")
    callback_args = task_info.get("callback_args")

    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return
    
    print(f"Waiting for WebSocket connection for session {session_id}")
    
    # Wait for WebSocket connection (with timeout)
    try:
        await asyncio.wait_for(task.websocket_ready.wait(), timeout=30.0)
        print(f"WebSocket ready for session {session_id}, starting task")
        
        # Additional small delay to ensure client is fully ready
        await asyncio.sleep(0.5)
        
        # Mark task as started
        task.task_started.set()
        
        # return the callback to be executed
        await callback_fn(*callback_args)

    except asyncio.TimeoutError:
        print(f"Timeout waiting for WebSocket connection for session {session_id}")
        # Clean up session
        session_manager.remove_session(session_id)
        ws_manager.clear_session_state(session_id)
    except Exception as e:
        print(f"Error waiting for connection or starting task for session {session_id}: {e}")

async def request_user_input(session_id: str, fields):
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return False
        
    # Check if WebSocket is connected
    if not ws_manager.is_connected(session_id):
        print(f"No WebSocket connection for session {session_id}, cannot request user input")
        return False
        
    task.input_request = UserInputRequest(fields)
    print(f"Requesting user input for session {session_id}")
    
    await ws_manager.send_json(session_id, {
        "type": "request_user_input",
        "fields": fields
    }, save_state=True)
    
    print(f"Waiting for user input for session {session_id}")
    
    try:
        # Wait for user input with timeout
        await asyncio.wait_for(task.input_request.event.wait(), timeout=60.0)
        print(f"User input received for session {session_id}: {task.input_request.values}")
        return True
    except asyncio.TimeoutError:
        print(f"User input timeout for session {session_id}")
        await ws_manager.send_json(session_id, {
            "type": "stream", 
            "content": "Input timeout - task cancelled."
        }, save_state=True)
        return False

async def request_confirmation(session_id: str, message: str = "Do you want to proceed with this action?"):
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return False
        
    # Reset confirmation state
    task.confirm_event.clear()
    task.confirmed = None
    
    # Check if WebSocket is connected before sending
    if not ws_manager.is_connected(session_id):
        print(f"No WebSocket connection for session {session_id}, cannot request confirmation")
        return False
    
    await ws_manager.send_json(session_id, {
        "type": "request_confirmation", 
        "message": message
    }, save_state=True)
    
    try:
        # Wait for confirmation with timeout
        await asyncio.wait_for(task.confirm_event.wait(), timeout=30.0)
        return task.confirmed is True
    except asyncio.TimeoutError:
        print(f"Confirmation timeout for session {session_id}")
        await ws_manager.send_json(session_id, {
            "type": "stream", 
            "content": "Confirmation timeout - task cancelled."
        }, save_state=True)
        return False

async def wait_for_retry(session_id: str):
    task = session_manager.get_task(session_id)
    task.confirm_event.clear()
    task.confirmed = None
    await ws_manager.send_json(session_id, {"type": "request_retry", "message": "Do you want to retry the task?"}, save_state=True)
    await task.confirm_event.wait()
    return bool(task.confirmed)

def start_background_task(background_tasks: BackgroundTasks, task_info: dict):
    """Start the background task to wait for WebSocket connection and then execute the task."""
    # Don't start the background task immediately
    # Instead, wait for WebSocket connection to be established
    background_tasks.add_task(wait_for_connection_and_start_task, {
        "session_id": task_info.get("session_id"),
        "callback_fn": task_info.get("callback_fn"),
        "callback_args": task_info.get("callback_args"),
    })
