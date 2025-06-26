import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uuid

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
    background_tasks.add_task(long_running_task, session_id)
    return {"session_id": session_id}

@app.post("/cancel-task/{session_id}")
async def cancel_task(session_id: str):
    task = session_manager.get_task(session_id)
    if task:
        task.cancel_event.set()
        return {"status": "cancelled"}
    return JSONResponse(status_code=404, content={"error": "Session not found"})

# WebSocket manager to track connections per session
class WebSocketManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_json(self, session_id: str, data):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_json(data)

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
        session_manager.remove_session(session_id)

async def long_running_task(session_id: str):
    task = session_manager.get_task(session_id)
    max_retries = 2
    attempt = 0
    while attempt <= max_retries:
        try:
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
            # Simulate sending email
            print(f"Task {session_id} sending email: {task.input_request.values}")
            await asyncio.sleep(1)
            # Simulate possible failure
            if attempt < max_retries:
                raise Exception("Simulated task failure")
            # Wait for confirmation from user
            await request_confirmation(session_id)
            if not task.confirmed:
                print(f"Task {session_id} not confirmed by user.")
                return
            await asyncio.sleep(1)  # Simulate some processing time
            # Notify frontend of completion and values
            await ws_manager.send_json(session_id, {"type": "task_completed", "values": task.input_request.values})
            print(f"Task {session_id} completed.")
            return
        except Exception as e:
            print(f"Task {session_id} failed: {e}")
            attempt += 1
            if attempt > max_retries:
                await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": False})
                print(f"Task {session_id} failed after {max_retries+1} attempts.")
                return
            else:
                # Ask frontend if user wants to retry
                await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": True, "attempt": attempt})
                # Wait for user to confirm retry
                retry = await wait_for_retry(session_id)
                if not retry:
                    print(f"Task {session_id} not retried by user.")
                    return
                print(f"Retrying task {session_id}, attempt {attempt+1}")

async def request_user_input(session_id: str, fields):
    task = session_manager.get_task(session_id)
    task.input_request = UserInputRequest(fields)
    await ws_manager.send_json(session_id, {
        "type": "request_user_input",
        "fields": fields
    })
    await task.input_request.event.wait()

async def request_confirmation(session_id: str):
    task = session_manager.get_task(session_id)
    task.confirm_event.clear()
    task.confirmed = None
    await ws_manager.send_json(session_id, {"type": "request_confirmation", "message": "Do you want to send the email?"})
    await task.confirm_event.wait()

async def wait_for_retry(session_id: str):
    task = session_manager.get_task(session_id)
    task.confirm_event.clear()
    task.confirmed = None
    await ws_manager.send_json(session_id, {"type": "request_retry", "message": "Do you want to retry the task?"})
    await task.confirm_event.wait()
    return bool(task.confirmed)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
