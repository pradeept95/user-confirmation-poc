# FastAPIPOC

This project is a proof-of-concept with:
- **FastAPI backend**: Supports interruptible, session-based long-running tasks, and WebSocket-based confirmation/cancellation.
- **React frontend**: Supports request cancellation and real-time confirmation dialogs.

## Getting Started

### Backend
1. `cd backend`
2. `source ../venv/bin/activate`
3. `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm run dev`

---

## Features
- Interruptible API requests (user can cancel mid-flight)
- Server can pause for user confirmation (per session)
- Multi-user/session support

---

## Structure
- `backend/` - FastAPI server
- `frontend/` - React app
