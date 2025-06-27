#!/usr/bin/env python3
"""
Test script to verify race condition fixes in WebSocket communication.
"""
import asyncio
import websockets
import json
import requests
import time

async def test_multiple_connections():
    """Test multiple WebSocket connections to the same session."""
    print("Testing multiple connections to same session...")
    
    # Start a task first
    response = requests.post("http://localhost:8000/start-task")
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"Started task with session ID: {session_id}")
    
    # Open first WebSocket connection
    uri1 = f"ws://localhost:8000/ws/{session_id}"
    async with websockets.connect(uri1) as websocket1:
        print("Connected WebSocket 1")
        
        # Receive initial state
        initial_msg = await websocket1.recv()
        print(f"WebSocket 1 received: {json.loads(initial_msg)}")
        
        # Send connection acknowledgment
        ready_msg = await websocket1.recv()
        ready_data = json.loads(ready_msg)
        if ready_data.get("type") == "connection_ready":
            await websocket1.send(json.dumps({"type": "connection_acknowledged"}))
            print("WebSocket 1 sent connection acknowledgment")
        
        # Wait a bit for task to start
        await asyncio.sleep(2)
        
        # Open second WebSocket connection (simulating browser refresh)
        try:
            async with websockets.connect(uri1) as websocket2:
                print("Connected WebSocket 2")
                
                # Should receive state replay
                while True:
                    try:
                        msg = await asyncio.wait_for(websocket2.recv(), timeout=2.0)
                        data = json.loads(msg)
                        print(f"WebSocket 2 received: {data}")
                        
                        if data.get("type") == "connection_ready":
                            await websocket2.send(json.dumps({"type": "connection_acknowledged"}))
                            print("WebSocket 2 sent connection acknowledgment")
                        elif data.get("type") == "request_confirmation":
                            # Respond to confirmation
                            await websocket2.send(json.dumps({"type": "confirm", "value": True}))
                            print("WebSocket 2 sent confirmation")
                        
                    except asyncio.TimeoutError:
                        print("WebSocket 2 timeout - ending test")
                        break
                        
        except Exception as e:
            print(f"WebSocket 2 error: {e}")
            
        # Close first connection
        print("Closing WebSocket 1")

async def test_connection_timing():
    """Test that task waits for WebSocket connection."""
    print("\nTesting connection timing...")
    
    # Start task
    response = requests.post("http://localhost:8000/start-task")
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"Started task with session ID: {session_id}")
    
    # Wait a bit before connecting (simulate slow connection)
    print("Waiting 3 seconds before connecting...")
    await asyncio.sleep(3)
    
    # Now connect
    uri = f"ws://localhost:8000/ws/{session_id}"
    async with websockets.connect(uri) as websocket:
        print("Connected WebSocket")
        
        # Should receive initial state with saved messages
        initial_msg = await websocket.recv()
        initial_data = json.loads(initial_msg)
        print(f"Initial state: {initial_data}")
        
        # Send connection acknowledgment
        ready_msg = await websocket.recv()
        ready_data = json.loads(ready_msg)
        if ready_data.get("type") == "connection_ready":
            await websocket.send(json.dumps({"type": "connection_acknowledged"}))
            print("Sent connection acknowledgment")
        
        # Listen for messages
        message_count = 0
        while message_count < 10:  # Limit to prevent infinite loop
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(msg)
                print(f"Received: {data}")
                message_count += 1
                
                if data.get("type") == "request_confirmation":
                    await websocket.send(json.dumps({"type": "confirm", "value": True}))
                    print("Sent confirmation")
                elif data.get("type") == "task_completed":
                    print("Task completed successfully!")
                    break
                    
            except asyncio.TimeoutError:
                print("Timeout waiting for messages")
                break

def test_session_info():
    """Test session info endpoint."""
    print("\nTesting session info...")
    
    # Start task
    response = requests.post("http://localhost:8000/start-task")
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"Started task with session ID: {session_id}")
    
    # Get session info immediately
    info_response = requests.get(f"http://localhost:8000/session-info/{session_id}")
    info_data = info_response.json()
    print(f"Session info: {info_data}")

async def main():
    """Run all tests."""
    print("Starting race condition tests...")
    print("Make sure the FastAPI server is running on localhost:8000")
    
    try:
        # Test session info
        test_session_info()
        
        # Test connection timing
        await test_connection_timing()
        
        # Test multiple connections
        await test_multiple_connections()
        
        print("\nAll tests completed!")
        
    except Exception as e:
        print(f"Test error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
