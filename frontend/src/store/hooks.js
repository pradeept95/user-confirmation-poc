import { useSelector } from "@legendapp/state/react";
import {
  appState$,
  canStartTask$,
  canCancelTask$,
  hasStreamContent$,
  hasAgentResponse$,
} from "./appState.js";

// Custom hooks for using Legend-State in React components
export const useAppState = () => {
  return {
    // Session state
    sessionId: useSelector(appState$.session.id),
    taskStatus: useSelector(appState$.session.status),
    currentQuery: useSelector(appState$.session.currentQuery),
    userQuery: useSelector(appState$.session.userQuery),
    isStateReplaying: useSelector(appState$.session.isStateReplaying),

    // UI state
    showConfirm: useSelector(appState$.ui.showConfirm),
    confirmationMessage: useSelector(appState$.ui.confirmationMessage),
    showRetry: useSelector(appState$.ui.showRetry),
    retryAttempt: useSelector(appState$.ui.retryAttempt),
    retryError: useSelector(appState$.ui.retryError),
    inputFields: useSelector(appState$.ui.inputFields),
    inputValues: useSelector(appState$.ui.inputValues),
    submitted: useSelector(appState$.ui.submitted),

    // Content state
    streamContent: useSelector(appState$.content.streamContent),
    agentResponse: useSelector(appState$.content.agentResponse),
    isGenerating: useSelector(appState$.content.isGenerating),

    // WebSocket state
    isConnected: useSelector(appState$.websocket.isConnected),
    isConnecting: useSelector(appState$.websocket.isConnecting),
    wsError: useSelector(appState$.websocket.lastError),

    // Computed state
    canStartTask: useSelector(canStartTask$),
    canCancelTask: useSelector(canCancelTask$),
    hasStreamContent: useSelector(hasStreamContent$),
    hasAgentResponse: useSelector(hasAgentResponse$),
  };
};

// Separate hooks for more granular subscriptions
export const useSessionState = () => ({
  sessionId: useSelector(appState$.session.id),
  taskStatus: useSelector(appState$.session.status),
  currentQuery: useSelector(appState$.session.currentQuery),
  userQuery: useSelector(appState$.session.userQuery),
  isStateReplaying: useSelector(appState$.session.isStateReplaying),
});

export const useUIState = () => ({
  showConfirm: useSelector(appState$.ui.showConfirm),
  confirmationMessage: useSelector(appState$.ui.confirmationMessage),
  showRetry: useSelector(appState$.ui.showRetry),
  retryAttempt: useSelector(appState$.ui.retryAttempt),
  retryError: useSelector(appState$.ui.retryError),
  inputFields: useSelector(appState$.ui.inputFields),
  inputValues: useSelector(appState$.ui.inputValues),
  submitted: useSelector(appState$.ui.submitted),
});

export const useContentState = () => ({
  streamContent: useSelector(appState$.content.streamContent),
  agentResponse: useSelector(appState$.content.agentResponse),
  isGenerating: useSelector(appState$.content.isGenerating),
});

export const useWebSocketState = () => ({
  isConnected: useSelector(appState$.websocket.isConnected),
  isConnecting: useSelector(appState$.websocket.isConnecting),
  wsError: useSelector(appState$.websocket.lastError),
});

export const useComputedState = () => ({
  canStartTask: useSelector(canStartTask$),
  canCancelTask: useSelector(canCancelTask$),
  hasStreamContent: useSelector(hasStreamContent$),
  hasAgentResponse: useSelector(hasAgentResponse$),
});
