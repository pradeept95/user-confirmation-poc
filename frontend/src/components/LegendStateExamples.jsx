import React from 'react';
import { observer } from '@legendapp/state/react';
import { useSessionState, useWebSocketState, useComputedState, actions } from '../store';

/**
 * Example component demonstrating Legend-State usage patterns
 * This component shows different ways to access and use state with Legend-State
 */

// Option 1: Using observer wrapper for fine-grained reactivity
const SessionStatus = observer(function SessionStatus() {
  const { taskStatus, sessionId, isStateReplaying } = useSessionState();
  const { isConnected, isConnecting } = useWebSocketState();

  return (
    <div style={{ 
      background: '#f5f5f5', 
      padding: '16px', 
      borderRadius: '8px',
      margin: '16px 0'
    }}>
      <h3>Session Status (Observer Component)</h3>
      <div>
        <strong>Task Status:</strong> {taskStatus}
        {isStateReplaying && <em> (Replaying...)</em>}
      </div>
      <div><strong>Session ID:</strong> {sessionId || 'Not started'}</div>
      <div>
        <strong>WebSocket:</strong> 
        {isConnecting ? ' Connecting...' : isConnected ? ' Connected' : ' Disconnected'}
      </div>
    </div>
  );
});

// Option 2: Using custom hooks for granular subscriptions
const TaskControls = () => {
  const { canStartTask, canCancelTask } = useComputedState();
  const { taskStatus } = useSessionState();

  return (
    <div style={{ 
      background: '#e8f4fd', 
      padding: '16px', 
      borderRadius: '8px',
      margin: '16px 0'
    }}>
      <h3>Task Controls (Hook-based)</h3>
      <div style={{ marginBottom: '12px' }}>
        <strong>Can Start:</strong> {canStartTask ? 'Yes' : 'No'}
        {' | '}
        <strong>Can Cancel:</strong> {canCancelTask ? 'Yes' : 'No'}
      </div>
      <button 
        onClick={() => actions.session.startTask()}
        disabled={!canStartTask}
        style={{ 
          marginRight: '8px',
          backgroundColor: canStartTask ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: canStartTask ? 'pointer' : 'not-allowed'
        }}
      >
        Start Task
      </button>
      <button 
        onClick={() => actions.session.cancelTask()}
        disabled={!canCancelTask}
        style={{ 
          backgroundColor: canCancelTask ? '#dc3545' : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: canCancelTask ? 'pointer' : 'not-allowed'
        }}
      >
        Cancel Task
      </button>
      <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
        Status: {taskStatus}
      </div>
    </div>
  );
};

// Option 3: Direct observable access (for advanced use cases)
import { appState$ } from '../store';

const DirectStateAccess = observer(function DirectStateAccess() {
  // Direct access to observables - use sparingly for performance-critical code
  const userQuery = appState$.session.userQuery.get();
  const streamCount = appState$.content.streamContent.get()?.length || 0;

  const handleDirectUpdate = () => {
    // Direct state mutation
    appState$.session.userQuery.set('Updated directly via observable!');
  };

  return (
    <div style={{ 
      background: '#fff3cd', 
      padding: '16px', 
      borderRadius: '8px',
      margin: '16px 0'
    }}>
      <h3>Direct Observable Access</h3>
      <div><strong>Current Query:</strong> {userQuery || 'None'}</div>
      <div><strong>Stream Items:</strong> {streamCount}</div>
      <button 
        onClick={handleDirectUpdate}
        style={{ 
          marginTop: '8px',
          backgroundColor: '#ffc107',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Update Query Directly
      </button>
    </div>
  );
});

// Main example component
const LegendStateExamples = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Legend-State Usage Examples</h2>
      <p>
        This component demonstrates different patterns for using Legend-State in React:
      </p>
      
      <SessionStatus />
      <TaskControls />
      <DirectStateAccess />
      
      <div style={{ 
        background: '#d4edda', 
        padding: '16px', 
        borderRadius: '8px',
        margin: '16px 0'
      }}>
        <h3>Benefits Demonstrated</h3>
        <ul>
          <li><strong>Fine-grained reactivity:</strong> Components only re-render when their observed data changes</li>
          <li><strong>Multiple access patterns:</strong> Hooks, observer wrapper, or direct observable access</li>
          <li><strong>Computed state:</strong> Derived values like canStartTask update automatically</li>
          <li><strong>Type safety:</strong> Full TypeScript support with automatic inference</li>
          <li><strong>No boilerplate:</strong> Simple get() and set() API</li>
        </ul>
      </div>
    </div>
  );
};

export default LegendStateExamples;
