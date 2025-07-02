import { appState$ } from "./appState.js";

// WebSocket Manager using Legend-State
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(sessionId) {
    this.disconnect(); // Clean up any existing connection

    appState$.websocket.isConnecting.set(true);
    appState$.websocket.lastError.set(null);

    try {
      this.ws = new WebSocket(
        `ws://localhost:8000/api/ws/session/${sessionId}`
      );
      appState$.websocket.connection.set(this.ws);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        appState$.websocket.isConnected.set(true);
        appState$.websocket.isConnecting.set(false);
        appState$.session.status.set("running");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        appState$.websocket.isConnected.set(false);
        appState$.websocket.isConnecting.set(false);
        appState$.websocket.connection.set(null);
        appState$.session.status.set("closed");
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        appState$.websocket.lastError.set(
          error.message || "WebSocket connection error"
        );
        appState$.session.status.set("error");
        appState$.websocket.isConnecting.set(false);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      appState$.websocket.lastError.set(error.message);
      appState$.websocket.isConnecting.set(false);
      appState$.session.status.set("error");
    }
  }

  disconnect() {
    if (this.ws) {
      console.log("Disconnecting WebSocket");

      // Clean up event listeners
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onopen = null;
      this.ws.onerror = null;

      // Close connection if open
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }

      this.ws = null;
    }

    // Reset WebSocket state
    appState$.websocket.connection.set(null);
    appState$.websocket.isConnected.set(false);
    appState$.websocket.isConnecting.set(false);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
      return false;
    }
  }

  handleMessage(msg) {
    console.log("WebSocket message received:", msg);

    switch (msg.type) {
      case "request_confirmation":
        appState$.ui.showConfirm.set(true);
        appState$.ui.confirmationMessage.set(
          msg.message || "Do you want to proceed with this action?"
        );
        break;

      case "request_user_input":
        appState$.ui.inputFields.set(msg.fields);
        appState$.ui.inputValues.set({});
        break;

      case "task_completed":
        appState$.session.status.set("completed");
        appState$.ui.submitted.set(msg.values);
        appState$.content.isGenerating.set(false);
        // Auto-close WebSocket after completion
        setTimeout(() => this.disconnect(), 100);
        break;

      case "task_started":
        appState$.session.status.set("running");
        appState$.content.isGenerating.set(true);
        if (msg.content) {
          appState$.content.streamContent.set((prev) => [...prev, msg.content]);
        }
        break;

      case "generating":
        appState$.content.isGenerating.set(true);
        if (msg.data?.content) {
          if (msg.data.event === "RunResponseContent") {
            appState$.content.agentResponse.set(
              (prev) => prev + msg.data.content
            );
          } else if (msg.data.event === "RunCompleted") {
            appState$.content.agentResponse.set(msg.data.content);
          }
        }
        break;

      case "task_cancelled":
        appState$.session.status.set("cancelled");
        appState$.content.isGenerating.set(false);
        if (msg.content) {
          appState$.content.streamContent.set((prev) => [...prev, msg.content]);
        }
        break;

      case "task_not_confirmed":
        appState$.session.status.set("not_confirmed");
        appState$.content.isGenerating.set(false);
        if (msg.content) {
          appState$.content.streamContent.set((prev) => [...prev, msg.content]);
        }
        break;

      case "task_failed":
      case "request_retry":
        appState$.session.status.set("failed");
        appState$.ui.submitted.set(null);
        if (msg.can_retry !== false) {
          appState$.ui.showRetry.set(true);
          appState$.ui.retryAttempt.set(msg.attempt || 1);
          appState$.ui.retryError.set(
            msg.error || msg.message || "Unknown error"
          );
        } else {
          appState$.ui.showRetry.set(false);
          appState$.ui.retryAttempt.set(null);
          appState$.ui.retryError.set(
            msg.error || msg.message || "Unknown error"
          );
        }
        break;

      case "stream":
        if (msg.content) {
          appState$.content.streamContent.set((prev) => [...prev, msg.content]);
        } else if (msg.data?.content) {
          appState$.content.streamContent.set((prev) => [
            ...prev,
            msg.data.content,
          ]);
        }
        break;

      case "initial_state":
        this.handleInitialState(msg);
        break;

      case "connection_ready":
        console.log("Connection ready received for session:", msg.session_id);
        this.send({ type: "connection_acknowledged" });
        break;

      default:
        console.warn("Unknown message type:", msg.type);
    }
  }

  handleInitialState(msg) {
    console.log(
      "Received initial state:",
      msg.message,
      `(${msg.state_count} messages)`
    );
    appState$.session.isStateReplaying.set(msg.state_count > 0);

    // Clear current content before applying state
    appState$.content.streamContent.set([]);
    appState$.content.agentResponse.set("");
    appState$.content.isGenerating.set(false);
    appState$.ui.inputFields.set(null);
    appState$.ui.showConfirm.set(false);
    appState$.ui.showRetry.set(false);
    appState$.ui.submitted.set(null);

    // Apply all state messages
    if (msg.state_messages?.length > 0) {
      msg.state_messages.forEach((stateMsg) => {
        this.handleMessage(stateMsg);
      });
    }

    // Clear replay indicator after a brief moment
    setTimeout(() => appState$.session.isStateReplaying.set(false), 1000);
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();
