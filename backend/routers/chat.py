import asyncio
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from models.types import StartTaskRequest
from service.session_manager import SessionManagerFactory
from service.websocket_manager import WebSocketManagerFactory

from agno.agent import Agent
from agno.agent import RunResponseEvent
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.googlesearch import GoogleSearchTools
from agno.tools.reasoning import ReasoningTools

from config import create_azure_openai_model
from task.task_manager import start_background_task, request_confirmation

chat_router = APIRouter(prefix="/api/chat", tags=["chat"])

session_manager = SessionManagerFactory.get_instance()
ws_manager = WebSocketManagerFactory.get_instance()

async def agent_handler(session_id: str, user_query: str): 
    print(f"FROM ARGS: Starting simulated chat completion for session {session_id} with query: {user_query}")
    task = session_manager.get_task(session_id)
    if not task:
        print(f"No task found for session {session_id}")
        return
        
    # Wait for WebSocket to be ready if not called from wait_for_connection_and_start_task
    if not task.task_started.is_set():
        try:
            await asyncio.wait_for(task.websocket_ready.wait(), timeout=10.0) 
        except asyncio.TimeoutError:
            print(f"Timeout waiting for WebSocket for session {session_id}")
            return
    
    try:
        # Check if task was cancelled before starting
        if task.cancel_event.is_set():
            print(f"Task {session_id} was cancelled before starting")
            await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
            return

        # response start 
        user_query = task.user_query
        await ws_manager.send_json(session_id, {
            "type": "task_started", 
            "content": f"Starting AI task with query: '{user_query}'"
        }, save_state=True)

        agent = Agent(
            model=create_azure_openai_model(),
            name="Web Search Agent",
            description="An agent that performs web searches and retrieves information.",
            instructions=[
                "Provide accurate and relevant information based on the user's query.", 
                "Always include the reference links in your response.",
                "If you need more information, ask the user for input.",
                f"Current session ID is {session_id}.",
                "if user needs to provide input, use the get_user_input tool.",
            ],
            tools=[
                GoogleSearchTools(requires_confirmation_tools=["google_search"]), 
                DuckDuckGoTools(requires_confirmation_tools=["duckduckgo_search"]),
                ReasoningTools(
                    think=True,
                    analyze=True,
                    add_instructions=True,
                    add_few_shot=True,
                )
            ],
            resolve_context=False,
            add_datetime_to_instructions=True,
            tool_call_limit=5,
            show_tool_calls=True,
            markdown=True,
            debug_mode=True,
            reasoning=True
        ) 

        # Initial async run with user's query
        for run_response in agent.run(user_query, stream=True, stream_intermediate_steps=True):
            # Check for cancellation at the start of each iteration
            if task.cancel_event.is_set(): 
                print(f"Task {session_id} cancelled during agent run")
                await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                return  # Clean return instead of raising exception

            # Handle paused states (confirmations, user input, etc.)
            if run_response.is_paused:
                print(f"Task {session_id} is paused. Waiting for user input or confirmation...")

                for tool in agent.run_response.tools_requiring_confirmation:
                    # Check for cancellation before requesting confirmation
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} cancelled during confirmation request")
                        await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                        return  # Clean return instead of raising exception

                    print(f"Tool name [bold blue]{tool.tool_name}({tool.tool_args})[/] requires confirmation.")
                    confirmation_message = (
                        f"Agent is trying to access {tool.tool_name} with query {tool.tool_args}. Do you want to proceed?"
                    )
                    await request_confirmation(session_id, confirmation_message)

                    # Check for cancellation after confirmation request
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} cancelled during confirmation wait")
                        await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                        return  # Clean return instead of raising exception

                    if not task.confirmed:
                        tool.confirmed = False
                    else:
                        tool.confirmed = True

                # continue the run after confirmation
                run_response = agent.continue_run(stream=True)

            # check if run_response is RunResponseEvent event type
            if isinstance(run_response, RunResponseEvent): 
                if run_response.content is not None:
                    # Check for cancellation before sending
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} was cancelled during streaming")
                        await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                        return  # Clean return instead of raising exception

                    chunk_dist = run_response.to_dict()
                    await ws_manager.send_json(session_id, {"type": "task_progress", "data": chunk_dist}, save_state=True)

            else: 
                # Stream the response
                for chunk in run_response:
                    # Check for cancellation before each chunk
                    if task.cancel_event.is_set():
                        print(f"Task {session_id} was cancelled during chunk streaming")
                        await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                        return  # Clean return instead of raising exception

                    if chunk.content is not None:
                        chunk_dist = chunk.to_dict()
                        await ws_manager.send_json(session_id, {"type": "task_progress", "data": chunk_dist}, save_state=True)
                
        # Final check before completion
        if task.cancel_event.is_set():
            await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
            return  # Clean return instead of raising exception

        await ws_manager.send_json(session_id, {
            "type": "task_completed", 
            "content": f"AI task completed for query: '{user_query}'"
        }, save_state=True)
        
    except asyncio.CancelledError:
        # Handle proper asyncio cancellation
        print(f"Task {session_id} was cancelled via asyncio.CancelledError")
        await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
        raise  # Re-raise to properly handle cancellation
    except Exception as e:
        print(f"Error during chat completion for {session_id}: {e}")
        # Check if it was a cancellation that caused the error
        if task.cancel_event.is_set():
            await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
        else:
            await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e)}, save_state=True)
    finally:
        # Clean up task resources
        if task.cancel_event.is_set():
            print(f"Task {session_id} cleanup after cancellation")
        else:
            print(f"Task {session_id} cleanup after completion")
        # Only cleanup if task still exists (might have been cleaned up by cancel endpoint)
        if session_manager.get_task(session_id):
            session_manager.cleanup_session(session_id)

async def team_handler(session_id: str, user_query: str):
    # Your team logic here
    pass

async def workflow_handler(session_id: str, user_query: str):
    # Your workflow logic here
    pass


@chat_router.post("/completion/{handler_name}")
async def start_task(request: StartTaskRequest, background_tasks: BackgroundTasks, handler_name: str):
    # Validate and sanitize the user query
    user_query = request.query.strip()
    if not user_query:
        return JSONResponse(status_code=400, content={"error": "Query cannot be empty"})
    
    if len(user_query) > 500:
        return JSONResponse(status_code=400, content={"error": "Query too long (max 500 characters)"})
    
    session_id, task = session_manager.create_session(user_query)
    print(f"Starting task for session {session_id} with query: {user_query}")

    # define handler mapping
    handler_map = {
        "agent": agent_handler,
        "team": team_handler,
        "workflow": workflow_handler,
    }
    callback_handler = handler_map.get(handler_name)
    if not callback_handler:
        return JSONResponse(status_code=400, content={"error": f"Invalid handler name: {handler_name}"})
    
    # Don't start the background task immediately
    # Instead, wait for WebSocket connection to be established
    start_background_task(background_tasks, {
        "session_id": session_id,
        "callback_fn": callback_handler,
        "callback_args": (session_id, user_query)
    })
    
    return {"session_id": session_id, "query": user_query}


@chat_router.post("/cancel/{session_id}")
async def cancel_task(session_id: str):
    task = session_manager.get_task(session_id)
    if task:
        print(f"Cancelling task for session {session_id}")
        task.cancel_event.set()
        
        # Send cancellation message through WebSocket if connected
        if ws_manager.is_connected(session_id):
            await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
        
        # Clean up session after a short delay to allow message to be sent
        await asyncio.sleep(0.1)
        session_manager.cleanup_session(session_id)
        
        return {"status": "cancelled", "session_id": session_id}
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@chat_router.get("/session/{session_id}")
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
