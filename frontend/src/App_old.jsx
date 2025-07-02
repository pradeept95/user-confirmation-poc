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
 

  const startTask = async () => {
    // Clean up existing WebSocket connection if any
    if (ws) {
      console.log("Closing existing WebSocket before starting new task");
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      setWs(null);
    }
    
    setTaskStatus("starting");
    setInputFields(null);
    setInputValues({});
    setStreamContent([]); // Clear stream content when starting new task
    setAgentResponse(""); // Clear agent response
    setIsGenerating(false);
    setShowConfirm(false);
    setConfirmationMessage("");
    setShowRetry(false);
    setSubmitted(null);
    setCurrentQuery(""); // Clear current query
    
    // Validate user query
    if (!userQuery.trim()) {
      alert("Please enter a question before starting the task.");
      setTaskStatus("idle");
      return;
    }
    
    const controller = new AbortController();
    abortController.current = controller;
    
    try {
      const res = await fetch("http://localhost:8000/api/chat/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userQuery.trim()
        }),
        signal: controller.signal,
      });
      
      if (!res.ok) {
        setTaskStatus("error");
        return;
      }
      
      const data = await res.json();
      setSessionId(data.session_id);
      setCurrentQuery(data.query || userQuery.trim()); // Store the current query
      
      // Open WebSocket for confirmation/cancellation and user input
      const socket = new WebSocket(`ws://localhost:8000/api/ws/session/${data.session_id}`);
      setWs(socket);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error starting task:", error);
        setTaskStatus("error");
      }
    }
  };

  const cancelTask = async () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    if (sessionId) {
      await fetch(`http://localhost:8000/api/chat/cancel/${sessionId}`, {
        method: "POST",
      });
    }
    if (ws) ws.send(JSON.stringify({ type: "cancel" }));
    setTaskStatus("cancelled");
  };

  const handleConfirm = (value) => {
    if (ws) ws.send(JSON.stringify({ type: "confirm", value }));
    setShowConfirm(false);
    if (!value) setTaskStatus("not confirmed");
  };

  const handleInputChange = (e, name) => {
    setInputValues((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const handleInputSubmit = () => {
    if (ws)
      ws.send(JSON.stringify({ type: "user_input", values: inputValues }));
    setInputFields(null);
  };

  // Show submitted values after task completes
  useEffect(() => {
    if (
      taskStatus === "closed" ||
      taskStatus === "cancelled" ||
      taskStatus === "task_not_confirmed"
    ) {
      setInputFields(null);
      setShowConfirm(false);
      setConfirmationMessage("");
      setIsGenerating(false);
    }
  }, [taskStatus]);

  useEffect(() => {
    if (taskStatus === "running" && !inputFields && submitted) {
      setSubmitted(null);
    }
  }, [taskStatus, inputFields]);

  // Listen for task completion and retry/failure
  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        const msg = JSON.parse(event.data);
        if (msg.type === "request_confirmation") {
          setShowConfirm(true);``
          setConfirmationMessage(msg.message || "Do you want to proceed with this action?");
        } else if (msg.type === "request_user_input") {
          setInputFields(msg.fields);
          setInputValues({});
        } else if (msg.type === "task_completed") {
          setTaskStatus("completed");
          setSubmitted(msg.values);
          setIsGenerating(false);
          // close WebSocket after task completion
          console.log("Task completed from state replay, closing WebSocket");
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 100);
          console.log("Task completed, closing WebSocket");
        } else if (msg.type === "task_started") {
          setTaskStatus("running");
          setIsGenerating(true);
          if (msg.content) {
            setStreamContent((prev) => [...prev, msg.content]);
          }
        } else if (msg.type === "generating") {
          setIsGenerating(true);
          // Handle agent response streaming
          if (msg.data && msg.data.content && msg.data.event === "RunResponseContent") {
            setAgentResponse((prev) => prev + msg.data.content);
          }else if (msg.data && msg.data.content && msg.data.event === "RunCompleted") {
            setAgentResponse((prev) => msg.data.content);
          }
        } else if (msg.type === "task_cancelled") {
          setTaskStatus("cancelled");
          setIsGenerating(false);
          if (msg.content) {
            setStreamContent((prev) => [...prev, msg.content]);
          }
        } else if (msg.type === "task_not_confirmed") {
          setTaskStatus("not_confirmed");
          setIsGenerating(false);
          if (msg.content) {
            setStreamContent((prev) => [...prev, msg.content]);
          }
        } else if (msg.type === "task_failed" || msg.type === "request_retry") {
          setTaskStatus("failed");
          setSubmitted(null);
          if (msg.can_retry !== false) {
            setShowRetry(true);
            setRetryAttempt(msg.attempt || 1);
            setRetryError(msg.error || msg.message || "Unknown error");
          } else {
            setShowRetry(false);
            setRetryAttempt(null);
            setRetryError(msg.error || msg.message || "Unknown error");
          }
        } else if (msg.type === "stream") {
          console.log("Received stream message:", msg);
          // Handle both old format (content) and new format (data)
          if (msg.content) {
            setStreamContent((prev) => [...prev, msg.content]);
          } else if (msg.data && msg.data.content) {
            setStreamContent((prev) => [...prev, msg.data.content]);
          }
        } else if (msg.type === "initial_state") {
          console.log("Received initial state:", msg.message, `(${msg.state_count} messages)`);
          setIsStateReplaying(msg.state_count > 0);
          
          // Clear current content before applying state
          setStreamContent([]);
          setAgentResponse("");
          setIsGenerating(false);
          setInputFields(null);
          setShowConfirm(false);
          setShowRetry(false);
          setSubmitted(null);
          
          // Apply all state messages at once
          if (msg.state_messages && msg.state_messages.length > 0) {
            msg.state_messages.forEach((stateMsg) => {
              // Process each saved state message
              if (stateMsg.type === "stream") {
                // Handle both old format (content) and new format (data)
                if (stateMsg.content) {
                  setStreamContent((prev) => [...prev, stateMsg.content]);
                } else if (stateMsg.data && stateMsg.data.content) {
                  setStreamContent((prev) => [...prev, stateMsg.data.content]);
                }
              } else if (stateMsg.type === "request_user_input") {
                setInputFields(stateMsg.fields);
                setInputValues({});
              } else if (stateMsg.type === "request_confirmation") {
                setShowConfirm(true);
              } else if (stateMsg.type === "task_completed") {
                setTaskStatus("completed");
                setSubmitted(stateMsg.values);
                setIsGenerating(false);
                // close WebSocket after task completion
                console.log("Task completed, closing WebSocket");
                console.log("Task completed from state replay, closing WebSocket");
                setTimeout(() => {
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                  }
                }, 100);
              } else if (stateMsg.type === "task_started") {
                setTaskStatus("running");
                setIsGenerating(true);
                if (stateMsg.content) {
                  setStreamContent((prev) => [...prev, stateMsg.content]);
                }
              } else if (stateMsg.type === "generating") {
                setIsGenerating(true);
                if (stateMsg.data && stateMsg.data.content) {
                  setAgentResponse((prev) => prev + stateMsg.data.content);
                }
              } else if (stateMsg.type === "task_cancelled") {
                setTaskStatus("cancelled");
                setIsGenerating(false);
                if (stateMsg.content) {
                  setStreamContent((prev) => [...prev, stateMsg.content]);
                }
              } else if (stateMsg.type === "task_not_confirmed") {
                setTaskStatus("not_confirmed");
                setIsGenerating(false);
                if (stateMsg.content) {
                  setStreamContent((prev) => [...prev, stateMsg.content]);
                }
              } else if (stateMsg.type === "task_failed" || stateMsg.type === "request_retry") {
                setTaskStatus("failed");
                if (stateMsg.can_retry !== false) {
                  setShowRetry(true);
                  setRetryAttempt(stateMsg.attempt || 1);
                  setRetryError(stateMsg.error || stateMsg.message || "Unknown error");
                }
              }
            });
          }
          
          // Clear replay indicator after a brief moment
          setTimeout(() => setIsStateReplaying(false), 1000);
        } else if (msg.type === "connection_ready") {
          console.log("Connection ready received for session:", msg.session_id);
          // Send acknowledgment that client is ready
          ws.send(JSON.stringify({ type: "connection_acknowledged" }));
        }
      };
      ws.onclose = () => {
        console.log("WebSocket closed");
        setTaskStatus("closed");
        setWs(null); // Clear WebSocket reference
      };
      ws.onopen = () => {
        console.log("WebSocket opened");
        setTaskStatus("running"); // Update status when WebSocket opens
      };
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setTaskStatus("error");
      };
    }
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.onmessage = null;
        ws.onclose = null;
        ws.onopen = null;
        ws.onerror = null;

        // Close WebSocket if it's still open
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log("Closing WebSocket on component unmount");
          ws.close();
        }
      }
    };
  }, [ws]);



  // Retry state
  const [showRetry, setShowRetry] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(null);
  const [retryError, setRetryError] = useState(null);

  const handleRetry = (value) => {
    if (ws) ws.send(JSON.stringify({ type: "confirm", value }));
    setShowRetry(false);
    if (!value) setTaskStatus("not retried");
  };

  const clearStream = () => {
    setStreamContent([]);
  };

  const clearAgentResponse = () => {
    setAgentResponse("");
  };

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
          onChange={(e) => setUserQuery(e.target.value)}
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
              onClick={() => setUserQuery("Who is the current president of the United States?")}
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
              onClick={() => setUserQuery("What are the latest developments in artificial intelligence?")}
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
              onClick={() => setUserQuery("Search for information about renewable energy trends in 2024")}
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
              onClick={() => setUserQuery("Write a short story about two students trapped in a haunted house in Montana.")}
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
            {userQuery.length}/500 characters
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={startTask} 
          disabled={taskStatus === "running" || taskStatus === "starting" || !userQuery.trim()}
          style={{
            backgroundColor: !userQuery.trim() ? "#6c757d" : (taskStatus === "running" || taskStatus === "starting" ? "#6c757d" : "#007bff")
          }}
        >
          {taskStatus === "starting" ? "Starting..." : "🚀 Start AI Task"}
        </button>
        <button onClick={cancelTask} disabled={taskStatus !== "running"} style={{ marginLeft: 8 }}>
          Cancel Task
        </button>
        <button onClick={clearStream} disabled={streamContent.length === 0} style={{ marginLeft: 8 }}>
          Clear Stream
        </button>
        <button onClick={clearAgentResponse} disabled={agentResponse.length === 0} style={{ marginLeft: 8 }}>
          Clear Agent Response
        </button>
      </div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: "16px" }}>
        Status: 
        <span className={`status-indicator status-${taskStatus.replace(' ', '_')}`}>
          {taskStatus}
        </span>
        {isStateReplaying && (
          <span style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
            (Restoring session state...)
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
      {streamContent.length > 0 && (
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
            Streaming content ({streamContent.length} items)
            {isStateReplaying && " - Restoring session state"}:
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
            {streamContent.map((item, idx) => (
              <div key={idx} style={{ 
                padding: "4px 0", 
                borderBottom: idx < streamContent.length - 1 ? "1px solid #ddd" : "none"
              }}>
                [{idx + 1}] {item}
              </div>
            ))}
          </div>
        </div>
      )}
      {agentResponse && (
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
            <MarkdownPreview source={agentResponse} />
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
}

export default App;
