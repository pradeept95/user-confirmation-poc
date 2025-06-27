# Agent Response UI Documentation

## Overview

This document describes the enhanced UI for displaying agent responses in the Human-in-the-Loop Task Demo application.

## New Features

### 1. Agent Response Display

- **Real-time streaming**: Agent responses are displayed as they are generated
- **Markdown support**: The agent responses support markdown formatting
- **Visual indicators**: Clear distinction between streaming logs and agent responses
- **Generation status**: Shows when the agent is actively generating content

### 2. Enhanced Message Types

#### Backend Message Types

- `task_started`: Sent when an agent task begins
- `generating`: Sent for each chunk of agent response content
- `task_cancelled`: Sent when a task is cancelled by user
- `task_not_confirmed`: Sent when user doesn't confirm an action

#### Frontend Handling

- Separate state management for agent responses vs streaming logs
- Real-time accumulation of agent content
- Visual differentiation between message types

### 3. UI Components

#### Agent Response Section

```jsx
{
  agentResponse && (
    <div
      style={{
        background: "#f8fff8",
        border: "2px solid #4CAF50",
        borderRadius: "8px",
        // ... styling
      }}
    >
      <div>🤖 Agent Response</div>
      <div>{agentResponse}</div>
    </div>
  );
}
```

#### Generation Indicator

- Animated "Generating..." badge
- Blinking cursor effect during generation
- Pulse animation for visual feedback

### 4. Enhanced Dialogs

#### Confirmation Dialog

- Clear visual design with icons
- Context-aware messaging
- Styled action buttons

#### User Input Dialog

- Improved form styling
- Field descriptions and placeholders
- Professional appearance

### 5. Status Management

#### Status Indicators

- Color-coded status badges
- Clear visual hierarchy
- Responsive design

#### Supported Statuses

- `idle`: Default state
- `starting`: Task initialization
- `running`: Task in progress
- `completed`: Task finished successfully
- `cancelled`: Task cancelled by user
- `error`: Task encountered an error
- `not_confirmed`: Task not confirmed by user

## Usage

### Starting the Application

1. Start the FastAPI backend: `uvicorn main:app --reload`
2. Start the React frontend: `npm run dev`
3. Open browser to `http://localhost:5173`

### Testing Agent Responses

1. Click "Start Task" to begin
2. The agent will start generating responses
3. Confirm actions when prompted
4. View real-time agent responses in the dedicated section

### Message Flow

```
Client -> Start Task -> Server
Server -> Creates session -> Background task waits
Client -> WebSocket connect -> Server
Server -> Sends connection_ready -> Client acknowledges
Server -> Starts agent task -> Streams responses
Client -> Displays responses in real-time
```

## Code Structure

### Frontend Components

- `agentResponse`: Stores accumulated agent content
- `isGenerating`: Tracks generation state
- `streamContent`: Separate from agent responses
- Enhanced message handlers for new types

### Backend Components

- Enhanced `simulate_chat_completion()` function
- Proper message type handling
- Agent response streaming logic

### Styling

- CSS animations for generation indicators
- Responsive design principles
- Clear visual hierarchy
- Professional color scheme

## API Reference

### WebSocket Message Types

#### `generating`

```json
{
  "type": "generating",
  "data": {
    "content": "partial response content",
    "role": "assistant"
    // ... other agent response data
  }
}
```

#### `task_started`

```json
{
  "type": "task_started",
  "content": "Task initialization message"
}
```

#### `task_not_confirmed`

```json
{
  "type": "task_not_confirmed",
  "content": "User did not confirm the action"
}
```

## Best Practices

### Performance

- Content accumulation is efficient
- Proper state cleanup on task completion
- Minimal re-renders during streaming

### User Experience

- Clear visual feedback during generation
- Responsive design for all screen sizes
- Accessible color contrast and typography

### Error Handling

- Graceful handling of connection issues
- Proper cleanup on component unmount
- Timeout handling for long-running tasks

## Troubleshooting

### Common Issues

1. **Agent responses not displaying**: Check WebSocket connection and message format
2. **Generation indicator stuck**: Verify `isGenerating` state management
3. **State replay issues**: Ensure proper message type handling in replay logic

### Debug Tips

- Check browser console for WebSocket messages
- Monitor network tab for connection issues
- Use the test script to verify backend functionality

## Future Enhancements

### Planned Features

- Markdown rendering for agent responses
- Copy to clipboard functionality
- Response export options
- Custom themes and styling
- Response search and filtering

### Extension Points

- Plugin system for response processors
- Custom message type handlers
- Themeable UI components
- Advanced streaming controls
