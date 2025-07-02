import { appState$ } from "./appState.js";
import { wsManager } from "./websocketManager.js";

// Action creators for managing application state and side effects
export const actions = {
  // Session actions
  session: {
    async startTask() {
      const userQuery = appState$.session.userQuery.get();

      // Validate user query
      if (!userQuery?.trim()) {
        alert("Please enter a question before starting the task.");
        return;
      }

      // Clean up existing state
      wsManager.disconnect();
      this.resetTaskState();

      appState$.session.status.set("starting");
      appState$.session.currentQuery.set("");

      // Create abort controller for the request
      const controller = new AbortController();
      appState$.request.abortController.set(controller);

      try {
        const res = await fetch("http://localhost:8000/api/chat/completion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: userQuery.trim(),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          appState$.session.status.set("error");
          return;
        }

        const data = await res.json();
        appState$.session.id.set(data.session_id);
        appState$.session.currentQuery.set(data.query || userQuery.trim());

        // Connect WebSocket
        wsManager.connect(data.session_id);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error starting task:", error);
          appState$.session.status.set("error");
        }
      }
    },

    async cancelTask() {
      const abortController = appState$.request.abortController.get();
      const sessionId = appState$.session.id.get();

      // Abort ongoing request
      if (abortController) {
        abortController.abort();
      }

      // Cancel task on server
      if (sessionId) {
        try {
          await fetch(`http://localhost:8000/api/chat/cancel/${sessionId}`, {
            method: "POST",
          });
        } catch (error) {
          console.error("Error cancelling task:", error);
        }
      }

      // Send cancel message via WebSocket
      wsManager.send({ type: "cancel" });
      appState$.session.status.set("cancelled");
    },

    resetTaskState() {
      // Reset UI state
      appState$.ui.inputFields.set(null);
      appState$.ui.inputValues.set({});
      appState$.ui.showConfirm.set(false);
      appState$.ui.confirmationMessage.set("");
      appState$.ui.showRetry.set(false);
      appState$.ui.submitted.set(null);

      // Reset content state
      appState$.content.streamContent.set([]);
      appState$.content.agentResponse.set("");
      appState$.content.isGenerating.set(false);
    },

    setUserQuery(query) {
      appState$.session.userQuery.set(query);
    },
  },

  // UI actions
  ui: {
    handleConfirm(value) {
      wsManager.send({ type: "confirm", value });
      appState$.ui.showConfirm.set(false);
      if (!value) {
        appState$.session.status.set("not_confirmed");
      }
    },

    handleInputChange(name, value) {
      appState$.ui.inputValues[name].set(value);
    },

    handleInputSubmit() {
      const inputValues = appState$.ui.inputValues.get();
      wsManager.send({ type: "user_input", values: inputValues });
      appState$.ui.inputFields.set(null);
    },

    handleRetry(value) {
      wsManager.send({ type: "confirm", value });
      appState$.ui.showRetry.set(false);
      if (!value) {
        appState$.session.status.set("not_retried");
      }
    },
  },

  // Content actions
  content: {
    clearStream() {
      appState$.content.streamContent.set([]);
    },

    clearAgentResponse() {
      appState$.content.agentResponse.set("");
    },
  },
};
