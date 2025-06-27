import asyncio
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections = {}
        self.session_states = {}  # Store all state messages per session

    async def connect(self, session_id: str, websocket: WebSocket):
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
        except Exception as e:
            print(f"Error sending initial state to {session_id}: {e}")
            self.disconnect(session_id)

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
                # self.disconnect(session_id)

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

    def get_session_state_count(self, session_id: str) -> int:
        """Get the number of saved state messages for a session."""
        return len(self.session_states.get(session_id, []))