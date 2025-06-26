#!/bin/bash

# Function to cleanup processes on script exit
cleanup() {
    echo "Shutting down services..."
    if [[ -n $BACKEND_PID ]]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [[ -n $FRONTEND_PID ]]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}

# Set up trap to cleanup on script exit or Ctrl+C
trap cleanup SIGINT SIGTERM

echo "Starting services..."
echo "Press Ctrl+C to stop both services"
echo ""

# Start the backend in background
echo "Starting FastAPI backend on port 8000..."
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start the frontend in background
echo "Starting React frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Both services are running:"
echo "- Backend: http://localhost:8000"
echo "- Frontend: http://localhost:5173 (or check terminal output)"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID