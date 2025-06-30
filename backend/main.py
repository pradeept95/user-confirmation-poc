import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# routers
from routers.websocket import ws_router
from routers.chat import chat_router

# ws_manager = WebSocketManagerFactory.get_instance()
# session_manager = SessionManagerFactory.get_instance()
app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)  

# Include routers
app.include_router(ws_router)
app.include_router(chat_router)

# async def long_running_task(session_id: str):
#     task = session_manager.get_task(session_id)
#     # Give a moment for WebSocket to connect
#     await asyncio.sleep(0.5)
#     print(f"Starting long running task for session {session_id}")
    
#     # Test stream message right away
#     try:
#         await ws_manager.send_json(session_id, {"type": "stream", "content": "Task started!"}, save_state=True)
#         print(f"Sent initial task started message for {session_id}")
#     except Exception as e:
#         print(f"Error sending initial task started message: {e}")
    
#     max_retries = 2
#     attempt = 0
#     while attempt <= max_retries:
#         try:
#             print(f"Starting attempt {attempt + 1} for session {session_id}")
#             # Example: ask for email details from user
#             await asyncio.sleep(1)
#             fields = [
#                 {"name": "subject", "description": "Subject of the email", "type": "string", "value": None},
#                 {"name": "body", "description": "Body of the email", "type": "string", "value": None},
#                 {"name": "to_address", "description": "Recipient email address", "type": "string", "value": None},
#             ]
#             await request_user_input(session_id, fields)
#             if not task.input_request or not task.input_request.values:
#                 print(f"Task {session_id} cancelled or no input.")
#                 return
            
#             print(f"Task {session_id} received input: {task.input_request.values}")
            
#             # Send immediate confirmation that we got the input
#             try:
#                 await ws_manager.send_json(session_id, {"type": "stream", "content": "Input received! Starting processing..."}, save_state=True)
#                 print(f"Sent initial stream message for {session_id}")
#             except Exception as e:
#                 print(f"Error sending initial stream message: {e}")
            
#             # Simulate streaming content to the user
#             print(f"Task {session_id} starting streaming...")
#             try:
#                 for i in range(5):
#                     stream_msg = f"Processing email step {i+1}/5... (attempt {attempt+1})"
#                     print(f"About to send stream message {i+1}: {stream_msg}")
#                     await ws_manager.send_json(session_id, {"type": "stream", "content": stream_msg}, save_state=True)
#                     print(f"Sent stream message {i+1} for {session_id}")
#                     await asyncio.sleep(0.8)
                    
#                     # Check for cancellation during streaming
#                     if task.cancel_event.is_set():
#                         print(f"Task {session_id} was cancelled during streaming")
#                         return
                        
#                 print(f"Completed streaming loop for {session_id}")
#             except Exception as e:
#                 print(f"Error during streaming: {e}")
#                 raise
            
#             # Simulate sending email
#             print(f"Task {session_id} sending email: {task.input_request.values}")
#             try:
#                 await ws_manager.send_json(session_id, {"type": "stream", "content": "Sending email..."}, save_state=True)
#                 print(f"Sent 'sending email' message for {session_id}")
#             except Exception as e:
#                 print(f"Error sending 'sending email' message: {e}")
#             await asyncio.sleep(1)
            
#             # Simulate possible failure (but only on first attempt)
#             if attempt == 0:
#                 print(f"Task {session_id} simulating failure on attempt {attempt}")
#                 try:
#                     await ws_manager.send_json(session_id, {"type": "stream", "content": "Error occurred, will retry..."}, save_state=True)
#                     print(f"Sent error message for {session_id}")
#                 except Exception as e:
#                     print(f"Error sending error message: {e}")
#                 raise Exception("Simulated task failure")
#             # Wait for confirmation from user
#             await request_confirmation(session_id)
#             if not task.confirmed:
#                 print(f"Task {session_id} not confirmed by user.")
#                 await ws_manager.send_json(session_id, {"type": "stream", "content": "Task cancelled by user."}, save_state=True)
#                 return
            
#             # Final processing with streaming
#             await ws_manager.send_json(session_id, {"type": "stream", "content": "Email confirmed! Finalizing..."}, save_state=True)
#             await asyncio.sleep(1)  # Simulate some processing time
#             await ws_manager.send_json(session_id, {"type": "stream", "content": "Task completed successfully!"}, save_state=True)
            
#             # Notify frontend of completion and values
#             await ws_manager.send_json(session_id, {"type": "task_completed", "values": task.input_request.values}, save_state=True)
#             print(f"Task {session_id} completed.")
#             return
#         except Exception as e:
#             print(f"Task {session_id} failed: {e}")
#             attempt += 1
#             if attempt > max_retries:
#                 await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": False}, save_state=True)
#                 print(f"Task {session_id} failed after {max_retries+1} attempts.")
#                 return
#             else:
#                 # Ask frontend if user wants to retry
#                 await ws_manager.send_json(session_id, {"type": "task_failed", "error": str(e), "can_retry": True, "attempt": attempt}, save_state=True)
#                 # Wait for user to confirm retry
#                 retry = await wait_for_retry(session_id)
#                 if not retry:
#                     print(f"Task {session_id} not retried by user.")
#                     return
#                 print(f"Retrying task {session_id}, attempt {attempt+1}")

# async def simulate_streaming(session_id: str): 
#     task = session_manager.get_task(session_id)
#     if not task:
#         print(f"No task found for session {session_id}")
#         return
#     try:
#         for i in range(5):
#             stream_msg = f"Simulated streaming message {i}/5 for session {session_id}" 
#             await ws_manager.send_json(session_id, {"type": "stream", "content": stream_msg}, save_state=True)
#             await asyncio.sleep(0.8)

#         await ws_manager.send_json(session_id, {"type": "task_completed", "content": "Streaming complete."}, save_state=True)  

#     except Exception as e:
#         print(f"Error during simulated streaming for {session_id}: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
