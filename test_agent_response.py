#!/usr/bin/env python3
"""
Test script to verify the agent response UI functionality.
Run this after starting the backend and frontend.
"""

import asyncio
import websockets
import json
import requests


async def test_agent_response_ui():
    """Test the agent response UI by simulating a WebSocket client."""
    
    # Start a task
    print("Starting task...")
    response = requests.post("http://localhost:8000/start-task")
    data = response.json()
    session_id = data["session_id"]
    print(f"Session ID: {session_id}")
    
    # Connect to WebSocket
    uri = f"ws://localhost:8000/ws/{session_id}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket")
            
            # Listen for messages
            message_count = 0
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(message)
                    message_count += 1
                    
                    print(f"[{message_count}] Received: {data['type']}")
                    
                    if data['type'] == 'connection_ready':
                        # Send acknowledgment
                        await websocket.send(json.dumps({
                            "type": "connection_acknowledged"
                        }))
                        print("Sent connection acknowledgment")
                    
                    elif data['type'] == 'request_confirmation':
                        print("Confirmation requested - auto-confirming...")
                        await websocket.send(json.dumps({
                            "type": "confirm", 
                            "value": True
                        }))
                        
                    elif data['type'] == 'generating':
                        if data.get('data', {}).get('content'):
                            print(f"Agent content: {data['data']['content']}")
                    
                    elif data['type'] == 'task_completed':
                        print("Task completed!")
                        break
                        
                    elif data['type'] == 'task_failed':
                        print(f"Task failed: {data.get('error', 'Unknown error')}")
                        break
                        
                except asyncio.TimeoutError:
                    print("No message received in 2 seconds, continuing...")
                    continue
                    
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_agent_response_ui())
