import { observable } from "@legendapp/state";

// Application State using Legend-State
export const appState$ = observable({
  // Session management
  session: {
    id: null,
    status: "idle", // 'idle', 'starting', 'running', 'completed', 'cancelled', 'error', 'failed', 'not_confirmed', 'closed'
    currentQuery: "",
    userQuery: "",
    isStateReplaying: false,
  },

  // UI State
  ui: {
    showConfirm: false,
    confirmationMessage: "",
    showRetry: false,
    retryAttempt: null,
    retryError: null,
    inputFields: null,
    inputValues: {},
    submitted: null,
  },

  // Content State
  content: {
    streamContent: [],
    agentResponse: "",
    isGenerating: false,
  },

  // WebSocket State
  websocket: {
    connection: null,
    isConnected: false,
    isConnecting: false,
    lastError: null,
  },

  // Request handling
  request: {
    abortController: null,
  },
});

// Computed observables for derived state
export const isDark$ = observable(() => appState$.ui.theme?.get() === "dark");
export const canStartTask$ = observable(() => {
  const status = appState$.session.status.get();
  const userQuery = appState$.session.userQuery.get();
  return status !== "running" && status !== "starting" && userQuery?.trim();
});

export const canCancelTask$ = observable(() => {
  const status = appState$.session.status.get();
  return status === "running";
});

export const hasStreamContent$ = observable(() => {
  const content = appState$.content.streamContent.get();
  return content && content.length > 0;
});

export const hasAgentResponse$ = observable(() => {
  const response = appState$.content.agentResponse.get();
  return response && response.length > 0;
});
