import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [taskStatus, setTaskStatus] = useState("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [ws, setWs] = useState(null);
  const [inputFields, setInputFields] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const abortController = useRef(null);

  const startTask = async () => {
    setTaskStatus("running");
    setInputFields(null);
    setInputValues({});
    const controller = new AbortController();
    abortController.current = controller;
    const res = await fetch("http://localhost:8000/start-task", {
      method: "POST",
      signal: controller.signal,
    });
    if (!res.ok) {
      setTaskStatus("error");
      return;
    }
    const data = await res.json();
    setSessionId(data.session_id);
    // Open WebSocket for confirmation/cancellation and user input
    const socket = new WebSocket(`ws://localhost:8000/ws/${data.session_id}`);
    setWs(socket);
  };

  const cancelTask = async () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    if (sessionId) {
      await fetch(`http://localhost:8000/cancel-task/${sessionId}`, {
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
      taskStatus === "not confirmed"
    ) {
      setInputFields(null);
      setShowConfirm(false);
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
        const msg = JSON.parse(event.data);
        if (msg.type === "request_confirmation") {
          setShowConfirm(true);
        } else if (msg.type === "request_user_input") {
          setInputFields(msg.fields);
          setInputValues({});
        } else if (msg.type === "task_completed") {
          setTaskStatus("completed");
          setSubmitted(msg.values);
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
        }
      };
      ws.onclose = () => setTaskStatus("closed");
    }
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

  return (
    <div style={{ padding: 32 }}>
      <h1>Human-in-the-Loop Task Demo</h1>
      <button onClick={startTask} disabled={taskStatus === "running"}>
        Start Task
      </button>
      <button onClick={cancelTask} disabled={taskStatus !== "running"}>
        Cancel Task
      </button>
      <div>Status: {taskStatus}</div>
      {showConfirm && (
        <div style={{ background: "#eee", padding: 16, margin: 16 }}>
          <div>Server requests confirmation. Continue?</div>
          <button onClick={() => handleConfirm(true)}>Yes</button>
          <button onClick={() => handleConfirm(false)}>No</button>
        </div>
      )}
      {inputFields && (
        <div style={{ background: "#eef", padding: 16, margin: 16 }}>
          <div>Server requests input:</div>
          {inputFields.map((field) => (
            <div key={field.name} style={{ margin: 8 }}>
              <label>{field.description}: </label>
              <input
                type="text"
                value={inputValues[field.name] || ""}
                onChange={(e) => handleInputChange(e, field.name)}
              />
            </div>
          ))}
          <button onClick={handleInputSubmit}>Submit</button>
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
    </div>
  );
}

export default App;
