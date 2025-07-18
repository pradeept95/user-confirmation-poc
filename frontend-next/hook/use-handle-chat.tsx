import { ReasoningSteps, ToolCall, useChatStore } from "@/store/chat-store";
import { useEffect, useRef, useState } from "react";

export type MessageTypes =
  | "initial_state"
  | "connection_ready"
  | "connection_acknowledged"
  | "task_started"
  | "task_progress"
  | "task_completed"
  | "task_failed"
  | "task_cancelled"
  | "request_user_input"
  | "request_confirmation";

export type ResponseMode = "agent" | "team" | "workflow" | "agent_with_mcp";

export const useHandleChat = (chatRoomId: string, mode: ResponseMode) => {
  const abortController = useRef<AbortController | null>(null);
  const chatRoomExists = useChatStore((state) =>
    state.chatRooms.some((room) => room.id === chatRoomId)
  );
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const setStatus = useChatStore((state) => state.setStatus);
  const status = useChatStore(
    (state) => state.chatRooms.find((room) => room.id === chatRoomId)?.status
  );

  const addMessage = useChatStore((state) => state.addMessage);
  const updateStreamingMessage = useChatStore(
    (state) => state.updateStreamingMessage
  );

  // for confirmation requests
  const setConfirmationRequest = useChatStore(
    (state) => state.setConfirmationRequest
  );
  const clearConfirmationRequests = useChatStore(
    (state) => state.clearConfirmationRequests
  );

  // for user input requests

  const setUserInputRequest = useChatStore(
    (state) => state.setUserInputRequest
  );
  const clearUserInputRequests = useChatStore(
    (state) => state.clearUserInputRequests
  );

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // streaming message response content
  const streamingMessageContent = useRef<string>("");
  const toolCallRef = useRef<ToolCall[]>([]);
  const reasoningStepsRef = useRef<ReasoningSteps[]>([]);

  // Helper function to parse reasoning data from backend
  const parseExtraData = (rawData: any) => {
    if (!rawData) return {};

    const extraData: any = {};

    // Handle reasoning_messages array
    if (
      rawData.reasoning_messages &&
      Array.isArray(rawData.reasoning_messages)
    ) {
      extraData.reasoning_messages = rawData.reasoning_messages;

      // Extract reasoning_steps from reasoning_messages content
      const reasoningSteps: any[] = [];
      rawData.reasoning_messages.forEach((message: any) => {
        if (message.content && typeof message.content === "string") {
          try {
            const parsed = JSON.parse(message.content);
            if (
              parsed.reasoning_steps &&
              Array.isArray(parsed.reasoning_steps)
            ) {
              reasoningSteps.push(...parsed.reasoning_steps);
            }
          } catch (error) {
            console.warn("Failed to parse reasoning message content:", error);
          }
        }
      });

      if (reasoningSteps.length > 0) {
        extraData.reasoning_steps = reasoningSteps;
      }
    }

    // Handle direct reasoning_steps (if provided separately)
    if (rawData.reasoning_steps && Array.isArray(rawData.reasoning_steps)) {
      extraData.reasoning_steps = rawData.reasoning_steps;
    }

    // Handle references
    if (rawData.references && Array.isArray(rawData.references)) {
      extraData.references = rawData.references;
    }

    return extraData;
  };

  // parse messages from the WebSocket
  const parseMessage = (message: string) => {
    const msg = JSON.parse(message);

    switch (msg.type) {
      case "initial_state":
        // Handle initial state
        break;
      case "connection_ready":
        // Handle connection ready
        break;
      case "connection_acknowledged":
        // Handle connection acknowledged
        break;
      case "task_started":
        // Handle task started
        setStatus?.(chatRoomId, "loading");
        break;
      case "task_progress":
        // Handle task progress - this includes agent responses
        if (msg.data?.content && msg.data?.event === "RunCompleted") {
          const processedExtraData = parseExtraData(msg.data.extra_data);

          addMessage(
            {
              id: sessionId!,
              created_at: msg.data.created_at || Date.now(),
              role: "agent",
              content: msg.data.content,
              extra_data: {
                ...processedExtraData,
                reasoning_steps: reasoningStepsRef.current || [],
                reasoning_messages:
                  msg.data.extra_data?.reasoning_messages || [],
              },
              tool_calls: toolCallRef.current || [],
            },
            chatRoomId
          );
          // If this is a RunCompleted event, task is finished
          if (msg.data.event === "RunCompleted") {
            setStatus?.(chatRoomId, "idle");
            updateStreamingMessage?.(chatRoomId, null);
            streamingMessageContent.current = "";
            toolCallRef.current = [];
            reasoningStepsRef.current = [];
          }
        } else if (
          msg.data?.content &&
          msg.data?.event === "RunResponseContent"
        ) {
          streamingMessageContent.current += msg.data.content;
          updateStreamingMessage?.(chatRoomId, {
            id: sessionId!,
            created_at: msg.data.created_at || Date.now(),
            role: "agent",
            content: streamingMessageContent.current,
            tool_calls: toolCallRef.current || [],
            extra_data: {
              reasoning_steps: reasoningStepsRef.current || [],
              reasoning_messages: msg.data.extra_data?.reasoning_messages || [],
            },
          });
        }
        // tool call handling
        else if (msg.data?.event === "ToolCallCompleted" && msg.data?.tool) {
          // create tool call details and add to toolCallRef
          const toolCall: ToolCall = {
            role: "tool",
            tool_name: msg.data.tool.tool_name,
            tool_call_id: msg.data.tool.tool_call_id,
            content: msg.data.tool.result || "",
            tool_args: msg.data.tool.tool_args || {},
            tool_call_error: msg.data.tool.tool_call_error || false,
            created_at: msg.data.tool.created_at || Date.now(),
            metrics: msg.data.tool.metrics || null,
          };
          toolCallRef.current.push(toolCall);
        } else if (
          msg.data?.event === "ReasoningCompleted" &&
          Array.isArray(msg.data.content)
        ) {
          // create reasoning steps details and add to reasoningStepsRef
          reasoningStepsRef.current.push(...msg.data.content);
        } else if (msg.data?.event === "ReasoningStep") {
          // Handle reasoning messages
          reasoningStepsRef.current.push(msg.data.content);
        }
        break;
      case "task_completed":
        // Handle task completed
        setStatus?.(chatRoomId, "idle");
        updateStreamingMessage?.(chatRoomId, null);

        socket?.close();
        break;
      case "task_failed":
        // Handle task failed
        setStatus?.(chatRoomId, "error");
        socket?.close();
        break;
      case "task_cancelled":
        // Handle task cancelled
        setStatus?.(chatRoomId, "idle");
        updateStreamingMessage?.(chatRoomId, null);
        streamingMessageContent.current = "";
        addMessage(
          {
            id: sessionId!,
            created_at: Date.now(),
            role: "agent",
            content: "Task was cancelled by user.",
          },
          chatRoomId
        );
        socket?.close();
        break;
      case "request_user_input":
        // Handle user input request
        console.log("User input request received:", msg);
        if (msg && msg.fields) {
          setUserInputRequest?.(chatRoomId, msg.fields);
        }
        break;
      case "request_confirmation":
        // Handle confirmation request
        setConfirmationRequest?.(chatRoomId, {
          id: msg.id,
          message: msg.message,
        });
        break;
      default:
        console.warn(`Unknown message type: ${msg.type}`);
        break;
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        parseMessage(event.data);
      };

      socket.onclose = () => {
        console.log("WebSocket closed");
        setSocket(null);
      };

      socket.onopen = () => {
        console.log("WebSocket opened");
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    // Clean up on unmount
    return () => {
      if (socket) {
        socket.onmessage = null;
        socket.onclose = null;
        socket.onopen = null;
        socket.onerror = null;

        // Close WebSocket if it's still open
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          console.log("Closing WebSocket on component unmount");
          socket.close();
        }
      }
    };
  }, [socket]);

  const startTask = async () => {
    // check if chat room exists
    if (!chatRoomExists) {
      console.error("Chat room does not exist");
      return;
    }

    // Clean up existing WebSocket connection if any
    if (socket) {
      console.log("Closing existing WebSocket before starting new task");
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
      setSocket(null);
    }

    const controller = new AbortController();
    abortController.current = controller;

    updateStreamingMessage(chatRoomId, null);

    try {
      const inputValue = inputRef?.current?.value?.trim() || "";

      if (!inputValue) {
        console.warn("Input value is empty, not starting task");
        return;
      }

      // add message locally
      addMessage(
        {
          id: crypto.randomUUID(), // use sessionId if available, otherwise generate a new one
          created_at: Date.now(),
          role: "user",
          content: inputValue,
        },
        chatRoomId
      );

      const res = await fetch(
        `http://localhost:8000/api/chat/completion/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: inputValue,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        // setTaskStatus("error");
        setStatus?.(chatRoomId, "error");
        return;
      }

      const data = await res.json();
      setSessionId(data.session_id);

      setStatus?.(chatRoomId, "loading");
      inputRef?.current?.focus();
      if (inputRef?.current) {
        inputRef.current.value = "";
      }

      // build socket connection with retry
      const connectSocket = (retries: number) => {
        const socket = new WebSocket(
          `ws://localhost:8000/api/ws/session/${data.session_id}`
        );

        socket.onopen = () => {
          console.log("WebSocket connected");
          setSocket(socket);
        };

        socket.onclose = (event) => {
          console.log("WebSocket closed:", event);
          setSocket(null);
          if (retries > 0) {
            console.log(
              `Retrying WebSocket connection... (${retries} attempts left)`
            );
            setTimeout(() => connectSocket(retries - 1), (retries - 1) * 300);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      };

      connectSocket(5);
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error starting task:", error);
      }
      setStatus?.(chatRoomId, "error");
    }
  };

  const cancelTask = async () => {
    if (abortController.current) {
      abortController.current.abort();
    }

    // First, send cancel message through WebSocket if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "cancel" }));
    }

    // Then, call the HTTP cancel endpoint
    if (sessionId) {
      try {
        await fetch(`http://localhost:8000/api/chat/cancel/${sessionId}`, {
          method: "POST",
        });
        console.log("Task cancellation request sent successfully");
      } catch (error) {
        console.error("Error cancelling task:", error);
      }
    }

    // Update local state
    setStatus?.(chatRoomId, "idle");
    updateStreamingMessage?.(chatRoomId, null);

    // Close WebSocket connection
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  const handleConfirm = (value: boolean) => {
    if (socket) socket.send(JSON.stringify({ type: "confirm", value }));
    // Clear confirmation requests after handling
    clearConfirmationRequests?.(chatRoomId);
    // setShowConfirm(false);
    // if (!value) setTaskStatus("not confirmed");
  };

  const handleInputSubmit = (values: { [key: string]: string }) => {
    if (socket) {
      socket.send(JSON.stringify({ type: "user_input", values: values }));
    }
    // Clear user input requests after handling
    clearUserInputRequests?.(chatRoomId);
  };

  return {
    inputRef,
    startTask,
    cancelTask,
    handleConfirm,
    handleInputSubmit,
    status,
  };
};
