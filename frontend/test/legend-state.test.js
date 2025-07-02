import { describe, it, expect, beforeEach } from "vitest";
import { appState$, actions } from "../src/store";

// Test suite for Legend-State integration
describe("Legend-State Integration", () => {
  beforeEach(() => {
    // Reset state before each test
    appState$.session.id.set(null);
    appState$.session.status.set("idle");
    appState$.session.userQuery.set("");
    appState$.content.streamContent.set([]);
    appState$.content.agentResponse.set("");
    appState$.ui.showConfirm.set(false);
  });

  describe("Observable State", () => {
    it("should initialize with default values", () => {
      expect(appState$.session.status.get()).toBe("idle");
      expect(appState$.session.id.get()).toBe(null);
      expect(appState$.session.userQuery.get()).toBe("");
      expect(appState$.content.streamContent.get()).toEqual([]);
    });

    it("should update state reactively", () => {
      const userQuery = "Test query";
      appState$.session.userQuery.set(userQuery);

      expect(appState$.session.userQuery.get()).toBe(userQuery);
    });

    it("should handle nested state updates", () => {
      appState$.content.streamContent.set(["Item 1", "Item 2"]);

      expect(appState$.content.streamContent.get()).toEqual([
        "Item 1",
        "Item 2",
      ]);

      // Add to existing array
      appState$.content.streamContent.set((prev) => [...prev, "Item 3"]);

      expect(appState$.content.streamContent.get()).toEqual([
        "Item 1",
        "Item 2",
        "Item 3",
      ]);
    });
  });

  describe("Computed Observables", () => {
    it("should compute canStartTask correctly", () => {
      const { canStartTask$ } = require("../src/store");

      // Initially should be false (no user query)
      expect(canStartTask$.get()).toBe(false);

      // Set user query
      appState$.session.userQuery.set("Test query");
      expect(canStartTask$.get()).toBe(true);

      // Set status to running
      appState$.session.status.set("running");
      expect(canStartTask$.get()).toBe(false);
    });

    it("should compute hasStreamContent correctly", () => {
      const { hasStreamContent$ } = require("../src/store");

      expect(hasStreamContent$.get()).toBe(false);

      appState$.content.streamContent.set(["Item 1"]);
      expect(hasStreamContent$.get()).toBe(true);

      appState$.content.streamContent.set([]);
      expect(hasStreamContent$.get()).toBe(false);
    });
  });

  describe("Actions", () => {
    it("should update user query through actions", () => {
      const testQuery = "Test query via action";
      actions.session.setUserQuery(testQuery);

      expect(appState$.session.userQuery.get()).toBe(testQuery);
    });

    it("should clear stream content through actions", () => {
      appState$.content.streamContent.set(["Item 1", "Item 2"]);
      actions.content.clearStream();

      expect(appState$.content.streamContent.get()).toEqual([]);
    });

    it("should handle input changes correctly", () => {
      appState$.ui.inputValues.set({ name: "initial" });
      actions.ui.handleInputChange("name", "updated");

      expect(appState$.ui.inputValues.name.get()).toBe("updated");
    });
  });

  describe("State Persistence", () => {
    it("should maintain state consistency across operations", () => {
      // Simulate a complex state update scenario
      appState$.session.userQuery.set("Test query");
      appState$.session.status.set("running");
      appState$.content.streamContent.set(["Stream 1"]);
      appState$.ui.showConfirm.set(true);

      expect(appState$.session.userQuery.get()).toBe("Test query");
      expect(appState$.session.status.get()).toBe("running");
      expect(appState$.content.streamContent.get()).toEqual(["Stream 1"]);
      expect(appState$.ui.showConfirm.get()).toBe(true);
    });
  });

  describe("WebSocket State", () => {
    it("should initialize WebSocket state correctly", () => {
      expect(appState$.websocket.isConnected.get()).toBe(false);
      expect(appState$.websocket.isConnecting.get()).toBe(false);
      expect(appState$.websocket.connection.get()).toBe(null);
    });

    it("should update WebSocket connection state", () => {
      appState$.websocket.isConnecting.set(true);
      expect(appState$.websocket.isConnecting.get()).toBe(true);

      appState$.websocket.isConnected.set(true);
      appState$.websocket.isConnecting.set(false);

      expect(appState$.websocket.isConnected.get()).toBe(true);
      expect(appState$.websocket.isConnecting.get()).toBe(false);
    });
  });
});
