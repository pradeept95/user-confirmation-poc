import { useEffect } from "react";
import { observer } from '@legendapp/state/react';
import "./App.css";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { useAppState, actions } from './store';

const App = observer(function App() {
  const {
    sessionId,
    taskStatus,
    currentQuery,
    userQuery,
    isStateReplaying,
    showConfirm,
    confirmationMessage,
    showRetry,
    retryAttempt,
    retryError,
    inputFields,
    inputValues,
    submitted,
    streamContent,
    agentResponse,
    isGenerating,
    isConnected,
    isConnecting,
    wsError,
    canStartTask,
    canCancelTask,
    hasStreamContent,
    hasAgentResponse,
  } = useAppState();

  // Event handlers using the actions
  const handleStartTask = () => {
    actions.session.startTask();
  };

  const handleCancelTask = () => {
    actions.session.cancelTask();
  };

  const handleUserQueryChange = (e) => {
    actions.session.setUserQuery(e.target.value);
  };

  const handleConfirm = (value) => {
    actions.ui.handleConfirm(value);
  };

  const handleInputChange = (e, name) => {
    actions.ui.handleInputChange(name, e.target.value);
  };

  const handleInputSubmit = () => {
    actions.ui.handleInputSubmit();
  };

  const handleRetry = (value) => {
    actions.ui.handleRetry(value);
  };

  const clearStream = () => {
    actions.content.clearStream();
  };

  const clearAgentResponse = () => {
    actions.content.clearAgentResponse();
  };

  const setExampleQuery = (query) => {
    actions.session.setUserQuery(query);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      actions.session.cancelTask();
    };
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h4>Human-in-the-Loop Task Demo</h4>

      {/* User Query Input Section */}
      <div style={{ 
        background: "#f8f9fa", 
        border: "2px solid #dee2e6",
        borderRadius: "8px",
        padding: 16, 
        marginBottom: 24 
      }}>
        <div style={{ fontWeight: "bold", marginBottom: 12, color: "#495057" }}>
          💬 Ask the AI Agent
        </div>
        <div style={{ marginBottom: 12, fontSize: "14px", color: "#6c757d" }}>
          Enter your question or task for the AI agent to work on:
        </div>
        <textarea
          value={userQuery}
          onChange={handleUserQueryChange}
          placeholder="e.g., Who is the current president of the United States? or Search for information about climate change..."
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "12px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ced4da"}
        />
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginTop: 8 
        }}>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>
            Try examples: 
            <button 
              type="button"
              onClick={() => setExampleQuery("Who is the current president of the United States?")}
              style={{ 
                background: "none", 
                border: "none", 
                color: "#007bff", 
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "12px",
                margin: "0 4px",
                padding: 0
              }}
            >
              President
            </button>
            |
            <button 
              type="button"
              onClick={() => setExampleQuery("What are the latest developments in artificial intelligence?")}
              style={{ 
                background: "none", 
                border: "none", 
                color: "#007bff", 
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "12px",
                margin: "0 4px",
                padding: 0
              }}
            >
              AI News
            </button>
            |
            <button 
              type="button"
              onClick={() => setExampleQuery("Search for information about renewable energy trends in 2024")}
              style={{ 
                background: "none", 
                border: "none", 
                color: "#007bff", 
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "12px",
                margin: "0 4px",
                padding: 0
              }}
            >
              Energy
            </button>
            |
            <button 
              type="button"
              onClick={() => setExampleQuery("Write a short story about two students trapped in a haunted house in Montana.")}
              style={{ 
                background: "none", 
                border: "none", 
                color: "#007bff", 
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "12px",
                margin: "0 4px",
                padding: 0
              }}
            >
              Story
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>
            {userQuery?.length || 0}/500 characters
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={handleStartTask} 
          disabled={!canStartTask}
          style={{
            backgroundColor: !canStartTask ? "#6c757d" : "#007bff"
          }}
        >
          {taskStatus === "starting" ? "Starting..." : "🚀 Start AI Task"}
        </button>
        <button 
          onClick={handleCancelTask} 
          disabled={!canCancelTask} 
          style={{ marginLeft: 8 }}
        >
          Cancel Task
        </button>
        <button 
          onClick={clearStream} 
          disabled={!hasStreamContent} 
          style={{ marginLeft: 8 }}
        >
          Clear Stream
        </button>
        <button 
          onClick={clearAgentResponse} 
          disabled={!hasAgentResponse} 
          style={{ marginLeft: 8 }}
        >
          Clear Agent Response
        </button>
      </div>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: "16px" }}>
        Status: 
        <span className={`status-indicator status-${taskStatus?.replace(' ', '_')}`}>
          {taskStatus}
        </span>
        {isStateReplaying && (
          <span style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
            (Restoring session state...)
          </span>
        )}
        {isConnecting && (
          <span style={{ fontSize: "12px", color: "#0066cc", fontStyle: "italic" }}>
            (Connecting to WebSocket...)
          </span>
        )}
        {wsError && (
          <span style={{ fontSize: "12px", color: "#dc3545", fontStyle: "italic" }}>
            (WebSocket Error: {wsError})
          </span>
        )}
      </div>
      
      {/* Current Query Display */}
      {currentQuery && (taskStatus === "running" || taskStatus === "starting" || taskStatus === "completed") && (
        <div style={{ 
          background: "#e8f4fd", 
          border: "1px solid #bee5eb",
          borderRadius: "6px",
          padding: 12, 
          marginBottom: 16,
          fontSize: "14px"
        }}>
          <div style={{ fontWeight: "500", color: "#0c5460", marginBottom: 4 }}>
            🎯 Current Task:
          </div>
          <div style={{ color: "#0c5460", fontStyle: "italic" }}>
            "{currentQuery}"
          </div>
        </div>
      )}
      
      {showConfirm && (
        <div style={{ 
          background: "#fff3cd", 
          border: "2px solid #ffc107",
          borderRadius: "8px",
          padding: 16, 
          margin: 16 
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 8, color: "#856404" }}>
            🤔 Agent Confirmation Required
          </div>
          <div style={{ marginBottom: 12 }}>
            {confirmationMessage || "Do you want to proceed with this action?"}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={() => handleConfirm(true)}
              style={{ backgroundColor: "#28a745" }}
            >
              ✅ Yes, Continue
            </button>
            <button 
              onClick={() => handleConfirm(false)}
              style={{ backgroundColor: "#dc3545" }}
            >
              ❌ No, Cancel
            </button>
          </div>
        </div>
      )}

      {inputFields && (
        <div style={{ 
          background: "#e3f2fd", 
          border: "2px solid #2196F3",
          borderRadius: "8px",
          padding: 16, 
          margin: 16 
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 12, color: "#1565C0" }}>
            📝 Agent Requires Input
          </div>
          <div style={{ marginBottom: 12 }}>
            Please provide the following information:
          </div>
          {inputFields.map((field) => (
            <div key={field.name} style={{ margin: "12px 0" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "4px", 
                fontWeight: "500",
                color: "#1565C0"
              }}>
                {field.description}:
              </label>
              <input
                type="text"
                value={inputValues[field.name] || ""}
                onChange={(e) => handleInputChange(e, field.name)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
                placeholder={`Enter ${field.description.toLowerCase()}...`}
              />
            </div>
          ))}
          <button 
            onClick={handleInputSubmit}
            style={{ 
              backgroundColor: "#2196F3",
              marginTop: "12px"
            }}
          >
            📤 Submit Information
          </button>
        </div>
      )}

      {submitted && (
        <div style={{ background: "#efe", padding: 16, margin: 16 }}>
          <div>Task completed with values:</div>
          <pre>{JSON.stringify(submitted, null, 2)}</pre>
        </div>
      )}

      {showRetry && (
        <div style={{ background: "#ffe0e0", padding: 16, margin: 16 }}>
          <div>
            Task failed{retryAttempt ? ` (attempt ${retryAttempt})` : ""}:{" "}
            {retryError}
          </div>
          <div>Do you want to retry?</div>
          <button onClick={() => handleRetry(true)}>Retry</button>
          <button onClick={() => handleRetry(false)}>Cancel</button>
        </div>
      )}

      {hasStreamContent && (
        <div style={{ 
          background: "#f0f8ff", 
          border: "2px solid #4a90e2",
          borderRadius: "8px",
          padding: 16, 
          margin: "16px 0",
          maxHeight: "200px",
          overflowY: "auto",
          opacity: isStateReplaying ? 0.7 : 1
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 8, color: "#2c5aa0" }}>
            Streaming content ({streamContent?.length || 0} items)
            {isStateReplaying && " - Restoring session state"}:
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
            {streamContent?.map((item, idx) => (
              <div key={idx} style={{ 
                padding: "4px 0", 
                borderBottom: idx < (streamContent?.length || 0) - 1 ? "1px solid #ddd" : "none"
              }}>
                [{idx + 1}] {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAgentResponse && (
        <div style={{ 
          background: "#f8fff8", 
          border: "2px solid #4CAF50",
          borderRadius: "8px",
          padding: 16, 
          margin: "16px 0",
          maxHeight: "400px",
          overflowY: "auto",
          opacity: isStateReplaying ? 0.7 : 1
        }}>
          <div style={{ 
            fontWeight: "bold", 
            marginBottom: 12, 
            color: "#2E7D32",
            display: "flex",
            alignItems: "start",
            gap: "8px"
          }}>
            <span>🤖 Agent Response</span>
            {isGenerating && (
              <span style={{ 
                fontSize: "12px", 
                background: "#4CAF50", 
                color: "white", 
                padding: "2px 8px", 
                borderRadius: "12px",
                animation: "pulse 1.5s infinite"
              }}>
                Generating...
              </span>
            )}
            {isStateReplaying && <span style={{ fontSize: "12px", color: "#666" }}>- Restoring session state</span>}
          </div>
          <div style={{ 
            fontFamily: "system-ui, -apple-system, sans-serif", 
            fontSize: "14px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}>
            <MarkdownPreview source={agentResponse || ""} />
            {isGenerating && (
              <span style={{ 
                animation: "blink 1s infinite",
                fontSize: "18px",
                marginLeft: "2px"
              }}>
                |
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default App;
