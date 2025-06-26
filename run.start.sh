#!/bin/bash

# Start the backend
echo "Starting backend..."
cd backend
source .venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

# Start the frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID