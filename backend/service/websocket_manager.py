import asyncio
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections = {}
        self.session_states = {}  # Store all state messages per session
        self.connection_locks = {}  # Per-session locks for connection management

    async def connect(self, session_id: str, websocket: WebSocket):
        # Create connection lock if it doesn't exist
        if session_id not in self.connection_locks:
            self.connection_locks[session_id] = asyncio.Lock()
            
        async with self.connection_locks[session_id]:
            # Prepare state data before accepting connection
            state_data = None
            if session_id in self.session_states:
                state_data = {
                    "type": "initial_state",
                    "message": f"Restoring session with {len(self.session_states[session_id])} saved messages",
                    "state_messages": [entry["data"] for entry in self.session_states[session_id]],
                    "state_count": len(self.session_states[session_id])
                }
                print(f"Preparing initial state for {session_id} with {len(self.session_states[session_id])} messages")
            else:
                state_data = {
                    "type": "initial_state", 
                    "message": "New session - no saved state",
                    "state_messages": [],
                    "state_count": 0
                }
                print(f"No saved state found for session {session_id}")
            
            await websocket.accept()
            self.active_connections[session_id] = websocket
            
            # Send initial state immediately after connection
            try:
                await websocket.send_json(state_data)
                print(f"Sent initial state to {session_id}")
                
                # Send connection ready signal
                await websocket.send_json({
                    "type": "connection_ready",
                    "session_id": session_id
                })
                print(f"Sent connection_ready to {session_id}")
                
            except Exception as e:
                print(f"Error sending initial state to {session_id}: {e}")
                self.disconnect(session_id)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_json(self, session_id: str, data, save_state: bool = True, timeout: float = 5.0):
        """
        Send JSON message to WebSocket client with timeout and retry logic.
        
        Args:
            session_id: The session ID to send to
            data: The message data
            save_state: Whether to save this message in session state for replay
            timeout: Timeout for sending message
        """
        # Use connection lock to ensure thread safety
        if session_id not in self.connection_locks:
            self.connection_locks[session_id] = asyncio.Lock()
            
        async with self.connection_locks[session_id]:
            ws = self.active_connections.get(session_id)
            if ws:
                try:
                    # print(f"Sending WebSocket message to {session_id}: {data}")
                    await asyncio.wait_for(ws.send_json(data), timeout=timeout)
                    
                    # Save state if requested
                    if save_state:
                        self._save_state(session_id, data)
                        
                except asyncio.TimeoutError:
                    print(f"Timeout sending WebSocket message to {session_id}")
                    # Don't disconnect on timeout, client might be processing
                    if save_state:
                        self._save_state(session_id, data)
                except Exception as e:
                    print(f"Error sending WebSocket message to {session_id}: {e}")
                    # Save state even if send failed for replay
                    if save_state:
                        self._save_state(session_id, data)
            else:
                print(f"No active WebSocket connection for {session_id}, saving to state")
                # Save state even if no connection for replay when client reconnects
                if save_state:
                    self._save_state(session_id, data)

    def is_connected(self, session_id: str) -> bool:
        """Check if a session has an active WebSocket connection."""
        return session_id in self.active_connections

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

    def clear_session_state(self, session_id: str):
        """Clear saved state for a session."""
        if session_id in self.session_states:
            del self.session_states[session_id]
            print(f"Cleared session state for {session_id}")
            
        # Also cleanup connection lock
        self.cleanup_connection_lock(session_id)

    def get_session_state_count(self, session_id: str) -> int:
        """Get the number of saved state messages for a session."""
        return len(self.session_states.get(session_id, []))

    def get_session_state(self, session_id: str) -> list:
        """Get all saved state messages for a session."""
        return [entry["data"] for entry in self.session_states.get(session_id, [])]

    def cleanup_connection_lock(self, session_id: str):
        """Clean up connection lock for a session."""
        if session_id in self.connection_locks:
            del self.connection_locks[session_id]