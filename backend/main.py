import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uuid
import random

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session/task state
class UserInputRequest:
    def __init__(self, fields):
        self.fields = fields  # List of dicts: {name, description, type, value}
        self.event = asyncio.Event()
        self.values = None

class SessionTask:
    def __init__(self):
        self.cancel_event = asyncio.Event()
        self.confirm_event = asyncio.Event()
        self.confirmed = None
        self.input_request = None  # For dynamic user input

class SessionManager:
    def __init__(self):
        self.sessions = {}

    def create_session(self):
        session_id = str(uuid.uuid4())
        task = SessionTask()
        self.sessions[session_id] = task
        return session_id, task

    def get_task(self, session_id):
        return self.sessions.get(session_id)

    def remove_session(self, session_id):
        if session_id in self.sessions:
            del self.sessions[session_id]

session_manager = SessionManager()

@app.post("/start-task")
async def start_task(request: Request, background_tasks: BackgroundTasks):
    session_id, task = session_manager.create_session()
    # randomly select a long-running task and stream messages  
    random_value = random.random()
    print(f"Random value for session {session_id}: {random_value}")
    if random_value < 0.5:
        background_tasks.add_task(long_running_task, session_id)
        return {"session_id": session_id}

    else: 
        background_tasks.add_task(simulate_streaming, session_id)
        return {"session_id": session_id}


@app.post("/cancel-task/{session_id}")
async def cancel_task(session_id: str):
    task = session_manager.get_task(session_id)
    if task:
        task.cancel_event.set()
        return {"status": "cancelled"}
    return JSONResponse(status_code=404, content={"error": "Session not found"})

@app.get("/session-info/{session_id}")
async def get_session_info(session_id: str):
    """Get session information including state count for debugging."""
    task = session_manager.get_task(session_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    
    state_count = ws_manager.get_session_state_count(session_id)
    is_connected = session_id in ws_manager.active_connections
    
    return {
        "session_id": session_id,
        "is_connected": is_connected,
        "saved_state_messages": state_count,
        "task_exists": True
    }

# WebSocket manager to track connections per session
class WebSocketManager:
    def __init__(self):
        self.active_connections = {}
        self.session_states = {}  # Store all state messages per session

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
        # Send full state to newly connected client
        await self._send_full_state(session_id, websocket)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_json(self, session_id: str, data, save_state: bool = True):
        """
        Send JSON message to WebSocket client.
        
        Args:
            session_id: The session ID to send to
            data: The message data
            save_state: Whether to save this message in session state for replay
        """
        ws = self.active_connections.get(session_id)
        if ws:
            try:
                print(f"Sending WebSocket message to {session_id}: {data}")
                await ws.send_json(data)
                
                # Save state if requested
                if save_state:
                    self._save_state(session_id, data)
                    
            except Exception as e:
                print(f"Error sending WebSocket message to {session_id}: {e}")
                # Remove disconnected WebSocket
                self.disconnect(session_id)

    def _save_state(self, session_id: str, data):
        """Save state message for session replay."""
        if session_id not in self.session_states:
            self.session_states[session_id] = []
        
        # Add timestamp for debugging
        state_entry = {
            "timestamp": asyncio.get_event_loop().time(),
            "data": data
        }
        self.session_states[session_id].append(state_entry)
        
        # Keep only last 100 state messages to prevent memory issues
        if len(self.session_states[session_id]) > 100:
            self.session_states[session_id] = self.session_states[session_id][-100:]

    async def _send_full_state(self, session_id: str, websocket: WebSocket):
        """Send full session state to a newly connected client."""
        if session_id in self.session_states:
            print(f"Sending full state replay to {session_id} ({len(self.session_states[session_id])} messages)")
            
            # Send state replay indicator
            try:
                await websocket.send_json({
                    "type": "state_replay_start",
                    "message": f"Replaying {len(self.session_states[session_id])} state messages"
                })
                
                # Send all saved state messages
                for state_entry in self.session_states[session_id]:
                    await websocket.send_json(state_entry["data"])
                
                # Send state replay complete indicator
                await websocket.send_json({
                    "type": "state_replay_complete",
                    "message": "State replay finished"
                })
                
            except Exception as e:
                print(f"Error sending full state to {session_id}: {e}")
        else:
            print(f"No saved state found for session {session_id}")

    def clear_session_state(self, session_id: str):
        """Clear saved state for a session."""
        if session_id in self.session_states:
            del self.session_states[session_id]
            print(f"Cleared session state for {session_id}")

    def get_session_state_count(self, session_id: str) -> int:
        """Get the number of saved state messages for a session."""
        return len(self.session_states.get(session_id, []))

ws_manager = WebSocketManager()

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    task = session_manager.get_task(session_id)
    if not task:
        await websocket.close()
        return
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "confirm":
                task.confirmed = data.get("value")
                task.confirm_event.set()
            elif data.get("type") == "cancel":
                task.cancel_event.set()
            elif data.get("type") == "user_input":
                if task.input_request:
                    task.input_request.values = data.get("values")
                    task.input_request.event.set()
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(session_id)
        # Cancel the task if it exists (user refreshed/closed browser)
        task = session_manager.get_task(session_id)
        if task:
            task.cancel_event.set()
        # Clear session state and remove session
        ws_manager.clear_session_state(session_id)
        session_manager.remove_session(session_id)

async def long_running_task(session_id: str):
    task = session_manager.get_task(session_id)
    # Give a moment for WebSocket to connect
    await asyncio.sleep(0.5)
    print(f"Starting long running task for session {session_id}")
    
    # Test stream message right away
    try:
        await ws_manager.send_json(session_id, {"type": "stream", "content": "Task started!"}, save_state=True)
        print(f"Sent initial task started message for {session_id}")
    except Exception as e:
        print(f"Error sending initial task started message: {e}")
    
    max_retries = 2
    attempt = 0
    while attempt <= max_retries:
        try:
            print(f"Starting attempt {attempt + 1} for session {session_id}")
            # Example: ask for email details from user
            await asyncio.sleep(1)
            fields = [
                {"name": "subject", "description": "Subject of the email", "type": "string", "value": None},
                {"name": "body", "description": "Body of the email", "type": "string", "value": None},
                {"name": "to_address", "description": "Recipient email address", "type": "string", "value": None},
            ]
            await request_user_input(session_id, fields)
            if not task.input_request or not task.input_request.values:
                print(f"Task {session_id} cancelled or no input.")
                return
            
            print(f"Task {session_id} received input: {task.input_request.values}")
            
            # Send immediate confirmation that we got the input
            try:
                await ws_manager.send_json(session_id, {"type": "stream", "content": "Input received! Starting processing..."}, save_state=True)
                print(f"Sent initial stream message for {session_id}")
            except Exception as e:
                print(f"Error sending initial stream message: {e}")
            
            # Simulate streaming content to the user
            print(f"Task {session_id} starting streaming...")
            try:
                for i in range(5):
                    stream_msg = f"Processing email step {i+1}/5... (attempt {attempt+1})"
                    print(f"About to send stream message {i+1}: {stream_msg}")
                    await ws_manager.send_json(session_id, {"type": "stream", "content": stream_msg}, save_state=True)
                    print(f"Sent stream message {i+1} for {session_id}")
                    await asyncio.sleep(0.8)
                    
                    # Check for cancellation during streaming
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} was cancelled during streaming")
                        return
                        
                print(f"Completed streaming loop for {session_id}")
            except Exception as e:
                print(f"Error during streaming: {e}")
                raise
            
            # Simulate sending email
            print(f"Task {session_id} sending email: {task.input_request.values}")
            try:
                await ws_manager.send_json(session_id, {"type": "stream", "content": "Sending email..."}, save_state=True)
                print(f"Sent 'sending email' message for {session_id}")
            except Exception as e:
                print(f"Error sending 'sending email' message: {e}")
            await asyncio.sleep(1)
            
            # Simulate possible failure (but only on first attempt)
            if attempt == 0:
                print(f"Task {session_id} simulating failure on attempt {attempt}")
                try:
                    await ws_manager.send_json(session_id, {"type": "stream", "content": "Error occurred, will retry..."}, save_state=True)
                    print(f"Sent error message for {session_id}")
                except Exception as e:
                    print(f"Error sending error message: {e}")
                raise Exception("Simulated task failure")
            # Wait for confirmation from user
            await request_confirmation(session_id)
            if not task.confirmed:
                print(f"Task {session_id} not confirmed by user.")
                await ws_manager.send_json(session_id, {"type": "stream", "content": "Task cancelled by user."}, save_state=True)
                return
            
            # Final processing with streaming
            await ws_manager.send_json(session_id, {"type": "stream", "content": "Email confirmed! Finalizing..."}, save_state=True)
            await asyncio.sleep(1)  # Simulate some processing time
            await ws_manager.send_json(session_id, {"type": "stream", "content": "Task completed successfully!"}, save_state=True)
            
            # Notify frontend of completion and values
            await ws_manager.send_json(session_id, {"type": "task_completed", "values": task.input_request.values}, save_state=True)
            print(f"Task {session_id} completed.")
            return
        except Exception as e:
            print(f"Task {session_id} failed: {e}")
            attempt += 1
            if attempt > max_retries:
                await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": False}, save_state=True)
                print(f"Task {session_id} failed after {max_retries+1} attempts.")
                return
            else:
                # Ask frontend if user wants to retry
                await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": True, "attempt": attempt}, save_state=True)
                # Wait for user to confirm retry
                retry = await wait_for_retry(session_id)
                if not retry:
                    print(f"Task {session_id} not retried by user.")
                    return
                print(f"Retrying task {session_id}, attempt {attempt+1}")


async def simulate_streaming(session_id: str):
    await asyncio.sleep(1)  # Simulate some initial processing delay
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return
    try:
        for i in range(5):
            stream_msg = f"Simulated streaming message {i}/5 for session {session_id}" 
            await ws_manager.send_json(session_id, {"type": "stream", "content": stream_msg}, save_state=True)
            await asyncio.sleep(0.8)

        await ws_manager.send_json(session_id, {"type": "task_completed", "content": "Streaming complete."}, save_state=True)  

    except Exception as e:
        print(f"Error during simulated streaming for {session_id}: {e}")

async def request_user_input(session_id: str, fields):
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return
    task.input_request = UserInputRequest(fields)
    print(f"Requesting user input for session {session_id}")
    await ws_manager.send_json(session_id, {
        "type": "request_user_input",
        "fields": fields
    }, save_state=True)
    print(f"Waiting for user input for session {session_id}")
    await task.input_request.event.wait()
    print(f"User input received for session {session_id}: {task.input_request.values}")

async def request_confirmation(session_id: str):
    task = session_manager.get_task(session_id)
    task.confirm_event.clear()
    task.confirmed = None
    await ws_manager.send_json(session_id, {"type": "request_confirmation", "message": "Do you want to send the email?"}, save_state=True)
    await task.confirm_event.wait()

async def wait_for_retry(session_id: str):
    task = session_manager.get_task(session_id)
    task.confirm_event.clear()
    task.confirmed = None
    await ws_manager.send_json(session_id, {"type": "request_retry", "message": "Do you want to retry the task?"}, save_state=True)
    await task.confirm_event.wait()
    return bool(task.confirmed)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
