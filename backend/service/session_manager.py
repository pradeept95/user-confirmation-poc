import uuid
from models.types import SessionTask

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