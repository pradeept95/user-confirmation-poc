from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from service.session_manager import SessionManagerFactory
from service.websocket_manager import WebSocketManagerFactory

ws_router = APIRouter(prefix="/api/ws", tags=["websocket"])

session_manager = SessionManagerFactory.get_instance()
ws_manager = WebSocketManagerFactory.get_instance()

@ws_router.websocket("/session/{session_id}")
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
                print(f"Received cancel message for session {session_id}")
                task.cancel_event.set()
                # Send immediate cancellation acknowledgment directly through WebSocket
                try:
                    await websocket.send_json({"type": "task_cancelled", "content": "Task cancelled by user."})
                    print(f"Sent cancellation acknowledgment to session {session_id}")
                except Exception as e:
                    print(f"Error sending cancellation acknowledgment: {e}")
                # Also save to state for replay
                await ws_manager.send_json(session_id, {"type": "task_cancelled", "content": "Task cancelled by user."}, save_state=True)
                break  # Exit the loop after handling cancellation
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
        # Cleanup WebSocket connection
        ws_manager.disconnect(session_id)
        task.connection_count -= 1
        
        # Only cancel task and cleanup if no other connections and task hasn't been cancelled by API
        if task.connection_count <= 0:
            print(f"No more connections for session {session_id}, checking cleanup")
            # Only set cancel event if not already cancelled
            if not task.cancel_event.is_set():
                task.cancel_event.set()
                print(f"Setting cancel event for session {session_id}")
            
            # Clean up state and session
            ws_manager.clear_session_state(session_id)
            session_manager.cleanup_session(session_id)
        else:
            print(f"Still have {task.connection_count} connections for session {session_id}")
            # Reset websocket_ready for next connection
            task.websocket_ready.clear()

