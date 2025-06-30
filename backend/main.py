import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from config import create_ollama_model
from agno.agent import Agent
from agno.agent import RunResponseEvent
from agno.tools.googlesearch import GoogleSearchTools
from agno.tools.duckduckgo import DuckDuckGoTools

import random
from service.websocket_manager import WebSocketManager
from models.types import UserInputRequest, SessionTask, StartTaskRequest
from service.session_manager import SessionManager

ws_manager = WebSocketManager()
session_manager = SessionManager()
app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)  

@app.post("/start-task")
async def start_task(request: StartTaskRequest, background_tasks: BackgroundTasks):
    # Validate and sanitize the user query
    user_query = request.query.strip()
    if not user_query:
        return JSONResponse(status_code=400, content={"error": "Query cannot be empty"})
    
    if len(user_query) > 500:
        return JSONResponse(status_code=400, content={"error": "Query too long (max 500 characters)"})
    
    session_id, task = session_manager.create_session(user_query)
    print(f"Starting task for session {session_id} with query: {user_query}")
    
    # Don't start the background task immediately
    # Instead, wait for WebSocket connection to be established
    background_tasks.add_task(wait_for_connection_and_start_task, session_id)
    
    return {"session_id": session_id, "query": user_query}


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
        "task_exists": True,
        "state_messages": ws_manager.get_session_state(session_id),
    } 
 

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    task = session_manager.get_task(session_id)
    if not task:
        await websocket.close()
        return
        
    # Connect to WebSocket
    await ws_manager.connect(session_id, websocket)
    
    # Signal that WebSocket is ready
    task.connection_count += 1
    task.websocket_ready.set()
    print(f"WebSocket connected for session {session_id}, signaling ready")
    
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
            elif data.get("type") == "connection_acknowledged":
                # Client has acknowledged the connection is ready
                print(f"Client acknowledged connection for session {session_id}")
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        print(f"WebSocket error for session {session_id}: {e}")
    finally:
        # Only clean up if this is the last connection
        ws_manager.disconnect(session_id)
        task.connection_count -= 1
        
        # Only cancel task and cleanup if no other connections
        if task.connection_count <= 0:
            print(f"No more connections for session {session_id}, cleaning up")
            task.cancel_event.set()
            ws_manager.clear_session_state(session_id)
            session_manager.remove_session(session_id)
        else:
            print(f"Still have {task.connection_count} connections for session {session_id}")
            # Reset websocket_ready for next connection
            task.websocket_ready.clear()


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

async def simulate_chat_completion(session_id: str): 
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return
        
    # Wait for WebSocket to be ready if not called from wait_for_connection_and_start_task
    if not task.task_started.is_set():
        try:
            await asyncio.wait_for(task.websocket_ready.wait(), timeout=10.0)
            await asyncio.sleep(0.5)  # Small delay for client readiness
        except asyncio.TimeoutError:
            print(f"Timeout waiting for WebSocket for session {session_id}")
            return
    
    try:
        # Check if task was cancelled before starting
        if task.cancel_event.is_set():
            print(f"Task {session_id} was cancelled before starting")
            return

        # response start 
        user_query = task.user_query
        await ws_manager.send_json(session_id, {
            "type": "task_started", 
            "content": f"Starting AI task with query: '{user_query}'"
        }, save_state=True)

        agent = Agent(
            model=create_ollama_model("llama3.2:3b"),
            name="Web Search Agent",
            description="An agent that performs web searches and retrieves information.",
            instructions=[
                "Provide accurate and relevant information based on the user's query.", 
                "Always include the reference links in your response.",
                "If you need more information, ask the user for input.",
            ],
            tools=[
                GoogleSearchTools(requires_confirmation_tools=["google_search"]), 
                DuckDuckGoTools(requires_confirmation_tools=["duckduckgo_search"]),
            ],
            add_datetime_to_instructions=True, 
            tool_call_limit=5,
            show_tool_calls=True,
            markdown=True
        ) 

        # Initial async run with user's query
        for run_response in agent.run(user_query, stream=True):
            # Check for cancellation
            if task.cancel_event.is_set(): 
                await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                return

            # Handle paused states (confirmations, user input, etc.)
            if run_response.is_paused:
                print(f"Task {session_id} is paused. Waiting for user input or confirmation...")
                # Handle confirmations, user input, or external tool execution
                await request_confirmation(session_id)

                if not task.confirmed:
                    print(f"Task {session_id} not confirmed by user.")
                    await ws_manager.send_json(session_id, {"type": "task_not_confirmed", "content": "Task not confirmed by user."}, save_state=True)
                    return
                else:
                    print(f"Task {session_id} confirmed by user. Continuing run...")
                    run_response = agent.continue_run(stream=True)

            # check if run_response is RunResponseEvent event type
            if  isinstance(run_response, RunResponseEvent):
                print(f"Received RunResponseEvent for session {session_id}")
                if run_response.content is not None:
                    # Check for cancellation before sending
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} was cancelled during streaming")
                        return
                         
                    chunk_dist = run_response.to_dict()
                    await ws_manager.send_json(session_id, {"type": "generating", "data": chunk_dist}, save_state=True)

            else: 
                # Stream the response
                for chunk in run_response:
                    if chunk.content is not None:
                        # Check for cancellation before sending
                        if task.cancel_event.is_set():
                            print(f"Task {session_id} was cancelled during streaming")
                            return
                            
                        # Print the content to console (for debugging)
                        print(f"Streaming chunk for session {session_id}: {chunk.content}")
                        chunk_dist = chunk.to_dict()
                        await ws_manager.send_json(session_id, {"type": "generating", "data": chunk_dist}, save_state=True)
                
        await ws_manager.send_json(session_id, {
            "type": "task_completed", 
            "content": f"AI task completed for query: '{user_query}'"
        }, save_state=True)
        
    except Exception as e:
        print(f"Error during simulated chat completion for {session_id}: {e}")
        await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e)}, save_state=True)

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

async def request_confirmation(session_id: str):
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
        "message": "Do you want to proceed with this action?"
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

async def wait_for_connection_and_start_task(session_id: str):
    """Wait for WebSocket connection to be established before starting the actual task."""
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
        
        # Start the actual task
        await simulate_chat_completion(session_id)
        
    except asyncio.TimeoutError:
        print(f"Timeout waiting for WebSocket connection for session {session_id}")
        # Clean up session
        session_manager.remove_session(session_id)
        ws_manager.clear_session_state(session_id)
    except Exception as e:
        print(f"Error waiting for connection or starting task for session {session_id}: {e}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
