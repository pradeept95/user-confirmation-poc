# Legend-State Integration for User Confirmation POC

This project has been refactored to use **Legend-State** for state management and WebSocket connection handling, providing a more efficient and scalable architecture.

## Overview

The application now uses Legend-State, a high-performance reactive state library that offers:

- 🦄 **Easy to use**: No boilerplate, just `get()` and `set()`
- ⚡ **Super fast**: Fine-grained reactivity with minimal renders
- 🔥 **Reactive**: Components re-render only when observed data changes
- 💾 **Powerful**: Advanced sync and persistence capabilities

## Architecture

### State Management Structure

```
src/store/
├── appState.js       # Main application state observables
├── websocketManager.js  # WebSocket connection management
├── actions.js        # Action creators for state mutations
├── hooks.js          # Custom React hooks for state access
└── index.js          # Main export file
```

### Key Components

#### 1. **App State (`appState.js`)**

- Centralized reactive state using Legend-State observables
- Organized into logical sections: session, UI, content, WebSocket, and request state
- Computed observables for derived state (e.g., `canStartTask$`, `hasStreamContent$`)

#### 2. **WebSocket Manager (`websocketManager.js`)**

- Singleton class for managing WebSocket connections
- Automatic state updates through Legend-State observables
- Handles connection lifecycle, message routing, and error recovery
- Supports session state restoration

#### 3. **Actions (`actions.js`)**

- Pure functions for performing state mutations and side effects
- Organized by domain: session, UI, and content actions
- Integrates with WebSocket manager for real-time communication

#### 4. **Hooks (`hooks.js`)**

- Custom React hooks using Legend-State's `useSelector`
- Granular subscriptions for optimal performance
- Separate hooks for different state domains

## Usage Examples

### Basic State Access

```jsx
import { useAppState } from "./store";

const Component = () => {
  const { taskStatus, userQuery, isGenerating } = useAppState();
  // Component only re-renders when these specific values change
};
```

### Granular State Access

```jsx
import { useSessionState, useContentState } from "./store";

const SessionComponent = () => {
  const { taskStatus, sessionId } = useSessionState();
  // Only subscribes to session-related state
};

const ContentComponent = () => {
  const { streamContent, agentResponse } = useContentState();
  // Only subscribes to content-related state
};
```

### Actions

```jsx
import { actions } from "./store";

const handleStartTask = () => {
  actions.session.startTask();
};

const handleUserInput = (name, value) => {
  actions.ui.handleInputChange(name, value);
};
```

### Direct State Manipulation

```jsx
import { appState$ } from "./store";

// Direct state access and mutation
const currentStatus = appState$.session.status.get();
appState$.session.userQuery.set("New query");
```

## Benefits of This Architecture

### Performance

- **Fine-grained reactivity**: Components only re-render when their specific observed data changes
- **Minimal re-renders**: Legend-State's proxy-based reactivity eliminates unnecessary updates
- **Optimized subscriptions**: Custom hooks allow components to subscribe only to relevant state slices

### Developer Experience

- **No boilerplate**: Simple `get()` and `set()` API
- **Type safety**: Full TypeScript support with automatic type inference
- **Debugging**: Legend-State provides excellent dev tools integration

### Maintainability

- **Separation of concerns**: Clear separation between state, actions, and UI logic
- **Centralized state**: All application state in one place with clear organization
- **Testability**: Actions are pure functions, making testing straightforward

### Scalability

- **Modular architecture**: Easy to add new state domains or features
- **WebSocket management**: Robust connection handling with automatic reconnection
- **Session persistence**: Built-in support for state restoration

## WebSocket Integration

The WebSocket manager integrates seamlessly with Legend-State:

```jsx
// WebSocket state is automatically managed
const { isConnected, isConnecting, wsError } = useWebSocketState();

// Messages automatically update state
// No manual state synchronization needed
```

## Migration from useState

The migration from React's `useState` to Legend-State provides several advantages:

**Before (useState)**:

```jsx
const [taskStatus, setTaskStatus] = useState("idle");
const [streamContent, setStreamContent] = useState([]);
const [ws, setWs] = useState(null);
// + 15 more useState calls
```

**After (Legend-State)**:

```jsx
const { taskStatus, streamContent, isConnected } = useAppState();
// Single hook, automatic reactivity, better performance
```

## Running the Application

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

```bash
npm run dev
```

The application now uses Legend-State for all state management, providing a more robust and scalable foundation for future development.
