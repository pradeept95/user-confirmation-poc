import uuid
import threading
from models.types import SessionTask

class SessionManager:
    def __init__(self):
        self.sessions = {}

    def create_session(self, user_query: str = "Who is the current president of the United States?"):
        session_id = str(uuid.uuid4())
        task = SessionTask(user_query)
        self.sessions[session_id] = task
        return session_id, task

    def get_task(self, session_id):
        return self.sessions.get(session_id)

    def remove_session(self, session_id):
        if session_id in self.sessions:
            del self.sessions[session_id]

    def cleanup_session(self, session_id: str): 
        if session_id in self.sessions:
            task = self.sessions[session_id]
            # Cancel any pending operations
            task.cancel_event.set()
            # Remove from active sessions
            del self.sessions[session_id]
            print(f"Session {session_id} cleaned up")
        else:
            print(f"Session {session_id} not found for cleanup")


class SessionManagerFactory:
    _instance = None
    _lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking pattern
                if cls._instance is None:
                    cls._instance = SessionManager()
        return cls._instance