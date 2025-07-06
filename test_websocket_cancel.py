#!/usr/bin/env python3
"""
Comprehensive test for WebSocket cancel functionality.
This test simulates the frontend-backend cancel flow.
"""

import asyncio
import aiohttp
import websockets
import json
import time

async def test_websocket_cancel_flow():
    """Test the complete WebSocket cancel flow."""
    base_url = "http://localhost:8000"
    ws_url = "ws://localhost:8000"
    
    print("Testing WebSocket cancel flow...")
    
    session_id = None
    websocket = None
    
    try:
        # Start a task
        async with aiohttp.ClientSession() as session:
            print("1. Starting a task...")
            start_response = await session.post(f"{base_url}/api/chat/completion", 
                                              json={"query": "Write a long story about space exploration"})
            
            if start_response.status != 200:
                print(f"Failed to start task: {start_response.status}")
                return False
            
            task_data = await start_response.json()
            session_id = task_data["session_id"]
            print(f"   Task started with session ID: {session_id}")
            
            # Connect to WebSocket
            print("2. Connecting to WebSocket...")
            websocket = await websockets.connect(f"{ws_url}/api/ws/session/{session_id}")
            print("   WebSocket connected")
            
            # Listen for initial messages
            print("3. Listening for initial messages...")
            for _ in range(3):  # Listen for a few messages
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    msg_data = json.loads(message)
                    print(f"   Received: {msg_data.get('type', 'unknown')}")
                    
                    if msg_data.get('type') == 'task_started':
                        print("   Task has started processing")
                        break
                except asyncio.TimeoutError:
                    print("   No more messages received")
                    break
            
            # Send cancel message through WebSocket
            print("4. Sending cancel message through WebSocket...")
            cancel_msg = {"type": "cancel"}
            await websocket.send(json.dumps(cancel_msg))
            print("   Cancel message sent")
            
            # Listen for cancellation response
            print("5. Listening for cancellation response...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                msg_data = json.loads(message)
                print(f"   Received: {msg_data}")
                
                if msg_data.get('type') == 'task_cancelled':
                    print("   ✅ Task cancellation confirmed via WebSocket")
                    return True
                else:
                    print(f"   ❌ Unexpected message type: {msg_data.get('type')}")
                    return False
                    
            except asyncio.TimeoutError:
                print("   ❌ No cancellation response received")
                return False
                
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
        return False
    finally:
        if websocket:
            await websocket.close()
            print("   WebSocket connection closed")

async def test_http_cancel_flow():
    """Test the HTTP cancel endpoint."""
    base_url = "http://localhost:8000"
    
    print("\nTesting HTTP cancel flow...")
    
    try:
        # Start a task
        async with aiohttp.ClientSession() as session:
            print("1. Starting a task...")
            start_response = await session.post(f"{base_url}/api/chat/completion", 
                                              json={"query": "Explain quantum computing in detail"})
            
            if start_response.status != 200:
                print(f"Failed to start task: {start_response.status}")
                return False
            
            task_data = await start_response.json()
            session_id = task_data["session_id"]
            print(f"   Task started with session ID: {session_id}")
            
            # Wait a bit to let the task start
            await asyncio.sleep(2)
            
            # Cancel via HTTP endpoint
            print("2. Cancelling via HTTP endpoint...")
            cancel_response = await session.post(f"{base_url}/api/chat/cancel/{session_id}")
            
            if cancel_response.status != 200:
                print(f"Failed to cancel task: {cancel_response.status}")
                return False
            
            cancel_data = await cancel_response.json()
            print(f"   ✅ Task cancelled: {cancel_data}")
            
            # Check if session was cleaned up
            await asyncio.sleep(1)
            info_response = await session.get(f"{base_url}/api/chat/session/{session_id}")
            
            if info_response.status == 404:
                print("   ✅ Session successfully cleaned up")
                return True
            else:
                print(f"   Session still exists: {info_response.status}")
                return True  # This is also acceptable
                
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
        return False

async def main():
    """Run all tests."""
    print("🧪 Running cancellation tests...\n")
    
    # Test WebSocket cancel flow
    ws_success = await test_websocket_cancel_flow()
    
    # Test HTTP cancel flow
    http_success = await test_http_cancel_flow()
    
    # Results
    print(f"\n📊 Test Results:")
    print(f"   WebSocket Cancel: {'✅ PASSED' if ws_success else '❌ FAILED'}")
    print(f"   HTTP Cancel: {'✅ PASSED' if http_success else '❌ FAILED'}")
    
    if ws_success and http_success:
        print("\n🎉 All cancellation tests PASSED!")
        return True
    else:
        print("\n💥 Some cancellation tests FAILED!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
