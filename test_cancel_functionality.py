#!/usr/bin/env python3
"""
Test script for cancellation functionality.
This script tests the cancel functionality by starting a task and then cancelling it.
"""

import asyncio
import aiohttp
import json
import time

async def test_cancel_functionality():
    """Test the cancel functionality by starting a task and then cancelling it."""
    base_url = "http://localhost:8000"
    
    print("Testing cancel functionality...")
    
    # Start a task
    async with aiohttp.ClientSession() as session:
        print("1. Starting a task...")
        start_response = await session.post(f"{base_url}/api/chat/completion", 
                                          json={"query": "Tell me about the history of artificial intelligence"})
        
        if start_response.status != 200:
            print(f"Failed to start task: {start_response.status}")
            return False
        
        task_data = await start_response.json()
        session_id = task_data["session_id"]
        print(f"   Task started with session ID: {session_id}")
        
        # Wait a bit to let the task start
        await asyncio.sleep(2)
        
        # Cancel the task
        print("2. Cancelling the task...")
        cancel_response = await session.post(f"{base_url}/api/chat/cancel/{session_id}")
        
        if cancel_response.status != 200:
            print(f"Failed to cancel task: {cancel_response.status}")
            return False
        
        cancel_data = await cancel_response.json()
        print(f"   Task cancelled: {cancel_data}")
        
        # Check session info after cancellation
        print("3. Checking session info after cancellation...")
        info_response = await session.get(f"{base_url}/api/chat/session/{session_id}")
        
        if info_response.status == 404:
            print("   Session successfully cleaned up after cancellation")
            return True
        elif info_response.status == 200:
            info_data = await info_response.json()
            print(f"   Session info: {info_data}")
            return True
        else:
            print(f"   Unexpected response: {info_response.status}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_cancel_functionality())
    if success:
        print("\n✅ Cancel functionality test PASSED")
    else:
        print("\n❌ Cancel functionality test FAILED")
