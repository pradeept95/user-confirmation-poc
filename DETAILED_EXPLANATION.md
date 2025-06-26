# FastAPI POC - Detailed Technical Explanation

## Overview

This project demonstrates a sophisticated human-in-the-loop task execution system using **FastAPI** for the backend and **React** for the frontend. The system supports interruptible, session-based long-running tasks with real-time communication through WebSockets, enabling user confirmation dialogs, dynamic input collection, and graceful task cancellation.

## Architecture Overview

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   React Frontend│ ◄─────────────────► │ FastAPI Backend │
│                 │                      │                 │
│ - Task Control  │                      │ - Session Mgmt  │
│ - Real-time UI  │                      │ - Task Execution│
│ - Confirmation  │                      │ - WebSocket Hub │
│ - Input Forms   │                      │ - Background Jobs│
└─────────────────┘                      └─────────────────┘
```

---

## Backend Architecture (FastAPI)

### Core Components

#### 1. Session Management System

**Purpose**: Manages multiple concurrent user sessions and their associated tasks.

```python
class SessionManager:
    def __init__(self):
        self.sessions = {}  # session_id -> SessionTask mapping
```

**Key Features**:
- **Unique Session IDs**: Generated using `uuid.uuid4()` for each task
- **Task State Tracking**: Each session contains a `SessionTask` object
- **Automatic Cleanup**: Sessions are removed when tasks complete or users disconnect

#### 2. SessionTask Class

**Purpose**: Represents the state and control mechanisms for a single task execution.

```python
class SessionTask:
    def __init__(self):
        self.cancel_event = asyncio.Event()      # For task cancellation
        self.confirm_event = asyncio.Event()     # For user confirmation
        self.confirmed = None                    # Stores user's confirmation choice
        self.input_request = None                # For dynamic user input
```

**Key Features**:
- **Asyncio Events**: Enable coordination between background tasks and WebSocket handlers
- **Cancellation Support**: Tasks can be interrupted at any point
- **Confirmation Mechanism**: Tasks can pause and wait for user approval
- **Dynamic Input**: Tasks can request arbitrary input from users

#### 3. WebSocket Manager

**Purpose**: Manages WebSocket connections and real-time communication with frontend clients.

```python
class WebSocketManager:
    def __init__(self):
        self.active_connections = {}  # session_id -> WebSocket mapping
```

**Key Features**:
- **Connection Tracking**: Maps session IDs to WebSocket connections
- **Broadcast Capability**: Send messages to specific sessions
- **Error Handling**: Gracefully handles disconnected clients
- **Automatic Cleanup**: Removes stale connections

### API Endpoints

#### 1. POST `/start-task`

**Purpose**: Initiates a new long-running task and creates a session.

**Flow**:
1. Creates a new session using `SessionManager`
2. Randomly selects between two demo tasks:
   - `long_running_task`: Complex task with user input, confirmation, and retry logic
   - `simulate_streaming`: Simple streaming demonstration
3. Starts the selected task as a background job
4. Returns session ID to frontend

#### 2. POST `/cancel-task/{session_id}`

**Purpose**: Cancels a running task by setting its cancellation event.

**Flow**:
1. Retrieves the task using session ID
2. Sets the `cancel_event` to signal task termination
3. Background task checks this event periodically and exits gracefully

#### 3. WebSocket `/ws/{session_id}`

**Purpose**: Establishes real-time bidirectional communication for task control.

**Incoming Messages**:
- `confirm`: User's response to confirmation requests
- `cancel`: User-initiated task cancellation
- `user_input`: User's response to input requests

**Outgoing Messages**:
- `stream`: Real-time progress updates
- `request_confirmation`: Requests user approval
- `request_user_input`: Requests dynamic input from user
- `task_completed`: Signals successful task completion
- `task_failed`: Signals task failure with retry options

#### 4. GET `/session-info/{session_id}`

**Purpose**: Provides debugging information about a session's state.

**Response**:
```json
{
    "session_id": "uuid-here",
    "is_connected": true,
    "saved_state_messages": 15,
    "task_exists": true
}
```

**Use Cases**:
- Debugging WebSocket connection issues
- Monitoring session state size
- Verifying session exists before operations

### Task Execution Examples

#### Long-Running Task with Human Interaction

The `long_running_task` demonstrates a complex workflow:

1. **Initial Setup**
   ```python
   # Create WebSocket connection delay
   await asyncio.sleep(0.5)
   
   # Send initial status
   await ws_manager.send_json(session_id, {
       "type": "stream", 
       "content": "Task started!"
   })
   ```

2. **Dynamic User Input Collection**
   ```python
   # Define input fields
   fields = [
       {"name": "subject", "description": "Subject of the email", "type": "string"},
       {"name": "body", "description": "Body of the email", "type": "string"},
       {"name": "to_address", "description": "Recipient email address", "type": "string"}
   ]
   
   # Request input from user
   await request_user_input(session_id, fields)
   ```

3. **Real-time Progress Streaming**
   ```python
   # Stream progress updates
   for i in range(5):
       stream_msg = f"Processing email step {i+1}/5..."
       await ws_manager.send_json(session_id, {
           "type": "stream", 
           "content": stream_msg
       })
       await asyncio.sleep(0.8)
   ```

4. **Error Handling and Retry Logic**
   ```python
   max_retries = 2
   attempt = 0
   while attempt <= max_retries:
       try:
           # Simulate work that might fail
           if attempt == 0:
               raise Exception("Simulated task failure")
           
           # Success path
           break
       except Exception as e:
           attempt += 1
           if attempt > max_retries:
               # Final failure
               await ws_manager.send_json(session_id, {
                   "type": "task_failed", 
                   "error": str(e), 
                   "can_retry": False
               })
               return
           else:
               # Offer retry
               await ws_manager.send_json(session_id, {
                   "type": "task_failed", 
                   "error": str(e), 
                   "can_retry": True, 
                   "attempt": attempt
               })
   ```

5. **User Confirmation**
   ```python
   # Wait for user confirmation before proceeding
   await request_confirmation(session_id)
   if not task.confirmed:
       await ws_manager.send_json(session_id, {
           "type": "stream", 
           "content": "Task cancelled by user."
       })
       return
   ```

### Cancellation and Cleanup

The system provides robust cancellation mechanisms:

1. **HTTP Cancellation**: Via `/cancel-task/{session_id}` endpoint
2. **WebSocket Cancellation**: Via WebSocket message
3. **Browser Disconnect**: Automatic cleanup when WebSocket closes
4. **Graceful Shutdown**: Tasks check cancellation events regularly

---

## Frontend Architecture (React)

### State Management

The React frontend uses multiple state variables to manage the complex UI interactions:

```javascript
const [sessionId, setSessionId] = useState(null);        // Current session ID
const [taskStatus, setTaskStatus] = useState("idle");    // Task execution state
const [showConfirm, setShowConfirm] = useState(false);   // Confirmation dialog visibility
const [ws, setWs] = useState(null);                      // WebSocket connection
const [inputFields, setInputFields] = useState(null);    // Dynamic input fields
const [inputValues, setInputValues] = useState({});      // User input values
const [submitted, setSubmitted] = useState(null);        // Completed task results
const [streamContent, setStreamContent] = useState([]);  // Real-time stream messages
const [showRetry, setShowRetry] = useState(false);       // Retry dialog visibility
```

### Task Lifecycle Management

#### 1. Task Initiation

```javascript
const startTask = async () => {
    setTaskStatus("running");
    setInputFields(null);
    setInputValues({});
    setStreamContent([]);
    
    // Create abort controller for HTTP request cancellation
    const controller = new AbortController();
    abortController.current = controller;
    
    // Start task via HTTP
    const res = await fetch("http://localhost:8000/start-task", {
        method: "POST",
        signal: controller.signal,
    });
    
    const data = await res.json();
    setSessionId(data.session_id);
    
    // Establish WebSocket connection
    const socket = new WebSocket(`ws://localhost:8000/ws/${data.session_id}`);
    setWs(socket);
};
```

#### 2. WebSocket Message Handling

The frontend listens for various message types from the backend:

```javascript
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    switch(msg.type) {
        case "request_confirmation":
            setShowConfirm(true);
            break;
            
        case "request_user_input":
            setInputFields(msg.fields);
            setInputValues({});
            break;
            
        case "task_completed":
            setTaskStatus("completed");
            setSubmitted(msg.values);
            break;
            
        case "task_failed":
            setTaskStatus("failed");
            if (msg.can_retry) {
                setShowRetry(true);
                setRetryAttempt(msg.attempt);
                setRetryError(msg.error);
            }
            break;
            
        case "stream":
            setStreamContent(prev => [...prev, msg.content]);
            break;
    }
};
```

#### 3. User Interaction Handlers

**Confirmation Dialog**:
```javascript
const handleConfirm = (value) => {
    if (ws) ws.send(JSON.stringify({ type: "confirm", value }));
    setShowConfirm(false);
    if (!value) setTaskStatus("not confirmed");
};
```

**Dynamic Input Form**:
```javascript
const handleInputSubmit = () => {
    if (ws) ws.send(JSON.stringify({ 
        type: "user_input", 
        values: inputValues 
    }));
    setInputFields(null);
};
```

**Task Cancellation**:
```javascript
const cancelTask = async () => {
    // Cancel HTTP request
    if (abortController.current) {
        abortController.current.abort();
    }
    
    // Cancel via HTTP endpoint
    if (sessionId) {
        await fetch(`http://localhost:8000/cancel-task/${sessionId}`, {
            method: "POST",
        });
    }
    
    // Cancel via WebSocket
    if (ws) ws.send(JSON.stringify({ type: "cancel" }));
    
    setTaskStatus("cancelled");
};
```

### UI Components

#### 1. Control Panel
- **Start Task Button**: Initiates new task execution
- **Cancel Task Button**: Stops running tasks
- **Clear Stream Button**: Clears streaming content display

#### 2. Dynamic Dialogs

**Confirmation Dialog**:
```javascript
{showConfirm && (
    <div style={{ background: "#eee", padding: 16, margin: 16 }}>
        <div>Server requests confirmation. Continue?</div>
        <button onClick={() => handleConfirm(true)}>Yes</button>
        <button onClick={() => handleConfirm(false)}>No</button>
    </div>
)}
```

**Input Form**:
```javascript
{inputFields && (
    <div style={{ background: "#eef", padding: 16, margin: 16 }}>
        <div>Server requests input:</div>
        {inputFields.map((field) => (
            <div key={field.name} style={{ margin: 8 }}>
                <label>{field.description}: </label>
                <input
                    type="text"
                    value={inputValues[field.name] || ""}
                    onChange={(e) => handleInputChange(e, field.name)}
                />
            </div>
        ))}
        <button onClick={handleInputSubmit}>Submit</button>
    </div>
)}
```

#### 3. Real-time Stream Display

```javascript
{streamContent.length > 0 && (
    <div style={{ 
        background: "#f0f8ff", 
        border: "2px solid #4a90e2",
        borderRadius: "8px",
        padding: 16, 
        margin: "16px 0",
        maxHeight: "200px",
        overflowY: "auto"
    }}>
        <div style={{ fontWeight: "bold", marginBottom: 8, color: "#2c5aa0" }}>
            Streaming content ({streamContent.length} items):
        </div>
        <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
            {streamContent.map((item, idx) => (
                <div key={idx} style={{ padding: "4px 0" }}>
                    [{idx + 1}] {item}
                </div>
            ))}
        </div>
    </div>
)}
```

---

## Communication Protocols

### HTTP REST API

**Used for**:
- Task initiation (`POST /start-task`)
- Task cancellation (`POST /cancel-task/{session_id}`)
- Initial session establishment

**Benefits**:
- Standard HTTP status codes
- Request/response pattern
- Easy caching and middleware integration
- Built-in browser support for cancellation (AbortController)

### WebSocket Protocol

**Used for**:
- Real-time bidirectional communication
- Progress streaming
- User confirmation requests
- Dynamic input collection
- Task status updates

**Message Format**:
```json
{
    "type": "message_type",
    "content": "optional_content",
    "fields": "optional_fields_array",
    "value": "optional_value",
    "error": "optional_error_message",
    "can_retry": "optional_boolean"
}
```

**Benefits**:
- Low latency communication
- Full duplex communication
- Persistent connection
- Real-time updates

---

## Key Features Explained

### 1. Interruptible Tasks

**Backend Implementation**:
```python
async def long_running_task(session_id: str):
    task = session_manager.get_task(session_id)
    
    for i in range(5):
        # Check for cancellation before each step
        if task.cancel_event.is_set():
            print(f"Task {session_id} was cancelled")
            return
            
        # Perform work
        await process_step(i)
```

**Frontend Implementation**:
```javascript
// Multiple cancellation paths
const cancelTask = async () => {
    // 1. Cancel HTTP request
    if (abortController.current) {
        abortController.current.abort();
    }
    
    // 2. Cancel via REST endpoint
    await fetch(`/cancel-task/${sessionId}`, { method: "POST" });
    
    // 3. Cancel via WebSocket
    if (ws) ws.send(JSON.stringify({ type: "cancel" }));
};
```

### 2. Session-Based Multi-User Support

**Session Isolation**:
- Each user gets a unique session ID
- Tasks are completely isolated between sessions
- WebSocket connections are mapped to specific sessions
- No data bleeding between users

**Concurrent Task Support**:
- Multiple users can run tasks simultaneously
- Each session maintains its own state
- Independent cancellation and confirmation

### 3. Dynamic User Input Collection

**Flexible Field Definition**:
```python
fields = [
    {
        "name": "field_name",
        "description": "Human-readable description",
        "type": "string",  # Extensible for other types
        "value": None      # Default value
    }
]
```

**Runtime Input Request**:
1. Backend defines required fields
2. Sends request to frontend via WebSocket
3. Frontend dynamically generates form
4. User fills out form and submits
5. Backend receives input and continues processing

### 4. Real-Time Progress Streaming

**Streaming Implementation**:
```python
# Backend streams progress
for i in range(steps):
    progress_msg = f"Step {i+1}/{steps} completed"
    await ws_manager.send_json(session_id, {
        "type": "stream",
        "content": progress_msg
    })
```

```javascript
// Frontend displays streaming content
case "stream":
    setStreamContent(prev => [...prev, msg.content]);
    break;
```

**Benefits**:
- Users see real-time progress
- Better user experience for long tasks
- Can include detailed step information
- Helps users understand task progress

### 5. Error Handling and Retry Logic

**Automatic Retry with User Confirmation**:
```python
max_retries = 2
attempt = 0

while attempt <= max_retries:
    try:
        # Attempt task execution
        await execute_task()
        break  # Success
    except Exception as e:
        attempt += 1
        if attempt > max_retries:
            # Final failure
            await notify_final_failure(session_id, e)
        else:
            # Ask user if they want to retry
            retry_approved = await request_retry(session_id, e)
            if not retry_approved:
                return
```

**User-Controlled Retry**:
- Tasks can fail gracefully
- Users are notified of failures with context
- Users can choose whether to retry
- Different behavior for temporary vs. permanent failures

---

## Technical Benefits

### 1. Scalability
- **Stateless HTTP**: Main API endpoints are stateless
- **Efficient WebSockets**: One connection per active session
- **Background Tasks**: Non-blocking task execution
- **Session Cleanup**: Automatic resource management

### 2. User Experience
- **Real-time Feedback**: Users see immediate progress
- **Graceful Cancellation**: Tasks can be stopped cleanly
- **Dynamic Interaction**: Tasks can request arbitrary input
- **Error Recovery**: Users can retry failed operations

### 3. Developer Experience
- **Clear Separation**: HTTP for commands, WebSocket for events
- **Type Safety**: Structured message formats
- **Debugging**: Comprehensive logging throughout
- **Extensibility**: Easy to add new message types and interactions

### 4. Reliability
- **Multiple Cancellation Paths**: Redundant cancellation mechanisms
- **Connection Monitoring**: Automatic cleanup on disconnect
- **Error Boundaries**: Graceful error handling at all levels
- **State Consistency**: Synchronized state between frontend and backend

---

## Use Cases

This architecture pattern is ideal for:

1. **Long-Running AI/ML Tasks**: Model training, data processing, inference pipelines
2. **Human-in-the-Loop Workflows**: Content moderation, decision approval, quality control
3. **Multi-Step Processes**: Order processing, document generation, complex calculations
4. **Interactive Simulations**: Scientific modeling, financial analysis, optimization
5. **Approval Workflows**: Document approval, payment processing, user onboarding

---

## Deployment Considerations

### Development
```bash
# Backend
cd backend
source ../venv/bin/activate
uvicorn main:app --reload

# Frontend
cd frontend
npm run dev
```

### Production
- **Backend**: Deploy with production ASGI server (Gunicorn + Uvicorn)
- **Frontend**: Build static files and serve via CDN/web server
- **WebSockets**: Ensure load balancer supports WebSocket connections
- **Session Storage**: Consider Redis for session persistence across instances
- **Monitoring**: Add health checks and metrics collection

---

## Security Considerations

1. **Session Management**: Implement proper session validation
2. **CORS Configuration**: Restrict origins in production
3. **Input Validation**: Validate all user inputs on backend
4. **Rate Limiting**: Prevent abuse of task creation
5. **Authentication**: Add user authentication for production use
6. **WebSocket Security**: Validate session ownership for WebSocket connections

---

## Conclusion

This FastAPI POC demonstrates a sophisticated pattern for building interactive, long-running task systems with real-time user interaction. The combination of HTTP REST APIs for command operations and WebSockets for real-time communication provides a robust foundation for complex human-in-the-loop workflows.

The architecture supports:
- ✅ Multi-user concurrent operation
- ✅ Graceful task cancellation
- ✅ Real-time progress feedback
- ✅ Dynamic user input collection
- ✅ Error handling and retry logic
- ✅ Session-based state management
- ✅ Clean separation of concerns

This pattern can be extended and adapted for various use cases requiring human oversight and interaction in automated processes.

---

## Enhanced WebSocket State Management

### Overview

The WebSocket system has been enhanced with comprehensive state management capabilities, allowing for seamless reconnection handling and state replay for clients.

### Key Features

#### 1. Automatic State Persistence

**Implementation**:
```python
class WebSocketManager:
    def __init__(self):
        self.active_connections = {}
        self.session_states = {}  # Store all state messages per session

    async def send_json(self, session_id: str, data, save_state: bool = True):
        # Send message and optionally save state
        if save_state:
            self._save_state(session_id, data)
```

**Benefits**:
- All important messages are automatically saved
- State is preserved even if WebSocket disconnects
- Configurable per message with `save_state` parameter

#### 2. State Replay on Reconnection

**How it works**:
1. When a new WebSocket connection is established for an existing session
2. The system automatically sends all previously saved state messages
3. Client receives complete session history and can reconstruct UI state

**Message Flow**:
```javascript
// Client receives during reconnection:
{ "type": "state_replay_start", "message": "Replaying 15 state messages" }
// ... all previous state messages replayed ...
{ "type": "state_replay_complete", "message": "State replay finished" }
```

#### 3. Memory Management

**State Limits**:
- Maximum 100 state messages per session
- Automatic cleanup when sessions end
- Timestamp tracking for debugging

**Cleanup Process**:
```python
def clear_session_state(self, session_id: str):
    """Clear saved state for a session."""
    if session_id in self.session_states:
        del self.session_states[session_id]
```

### Frontend Integration

The React frontend handles state replay gracefully:

```javascript
// State management during replay
const [isStateReplaying, setIsStateReplaying] = useState(false);

// Handle replay messages
case "state_replay_start":
    setIsStateReplaying(true);
    // Clear current state before replay
    setStreamContent([]);
    setInputFields(null);
    break;

case "state_replay_complete":
    setIsStateReplaying(false);
    break;
```

### Benefits for Users

1. **Seamless Reconnection**: If browser refreshes or WebSocket disconnects, full state is restored
2. **No Lost Progress**: All task progress and messages are preserved
3. **Visual Feedback**: Users see when state is being replayed
4. **Consistent Experience**: UI state always matches server state

### Use Cases

- **Network Interruptions**: Temporary connectivity issues don't lose progress
- **Browser Refresh**: Users can refresh page without losing task state
- **Multi-tab Support**: Opening same session in multiple tabs shows same state
- **Development**: Easier debugging with complete message history

---
