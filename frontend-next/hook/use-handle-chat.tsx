import { useChatStore } from "@/store/chat-store";
import { useEffect, useRef, useState } from "react";

type MessageTypes =
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

type Mode = "chat" | "agent" | "team" | "workflow"; 

export const useHandleChat = (chatRoomId: string) => {
  const abortController = useRef<AbortController>(null);
  const chatRoomExists = useChatStore((state) => state.chatRooms.some(room => room.id === chatRoomId));
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const setStatus = useChatStore((state) => state.setStatus);
  const status = useChatStore((state) => state.chatRooms.find(room => room.id === chatRoomId)?.status);
  
  const addMessage = useChatStore((state) => state.addMessage);
  const updateStreamingMessage = useChatStore((state) => state.updateStreamingMessage);

  const setConfirmationRequest = useChatStore((state) => state.setConfirmationRequest);
  const clearConfirmationRequests = useChatStore((state) => state.clearConfirmationRequests);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // streaming message response content
  const streamingMessageContent = useRef<string>("");

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
        addMessage({
          created_at: msg.data.created_at || Date.now(),
          role: 'agent',
          content: msg.data.content,  
        }, chatRoomId);
        
        // If this is a RunCompleted event, task is finished
        if (msg.data.event === "RunCompleted") {
          setStatus?.(chatRoomId, "idle");
        }
      }
      else if (msg.data?.content && msg.data?.event === "RunResponseContent") {
        streamingMessageContent.current += msg.data.content;
        updateStreamingMessage?.(chatRoomId, {
          created_at: msg.data.created_at || Date.now(),
          role: 'agent',
          content: streamingMessageContent.current,
        });
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
      socket?.close();
      break;
    case "request_user_input":
      // Handle user input request
      break;
    case "request_confirmation":
      // Handle confirmation request
      setConfirmationRequest?.(chatRoomId, {
        id: msg.id,
        message: msg.message
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
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      setSocket(null);
    }  
    
    const controller = new AbortController();
    abortController.current = controller;

    updateStreamingMessage(chatRoomId, null);
    
    try {

      const inputValue = inputRef?.current?.value?.trim() || '';


      // add message locally
      addMessage({
        created_at: Date.now(),
        role: 'user',
        content: inputValue
      }, chatRoomId);

      const res = await fetch("http://localhost:8000/api/chat/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: inputValue
        }),
        signal: controller.signal,
      });
      
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
        const socket = new WebSocket(`ws://localhost:8000/api/ws/session/${data.session_id}`);

        socket.onopen = () => {
          console.log("WebSocket connected");
          setSocket(socket);
        };

        socket.onclose = (event) => {
          console.log("WebSocket closed:", event);
          setSocket(null);
          if (retries > 0) {
            console.log(`Retrying WebSocket connection... (${retries} attempts left)`);
            setTimeout(() => connectSocket(retries - 1), (retries - 1) * 300);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      };

      connectSocket(5);

    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Error starting task:", error);
      }
      setStatus?.(chatRoomId, "error");
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
    if (socket) socket.send(JSON.stringify({ type: "cancel" }));
    setStatus?.(chatRoomId, "idle");
    // setTaskStatus("cancelled");
  };

  const handleConfirm = (value: boolean) => {
    if (socket) socket.send(JSON.stringify({ type: "confirm", value }));
    // Clear confirmation requests after handling
    clearConfirmationRequests?.(chatRoomId);
    // setShowConfirm(false);
    // if (!value) setTaskStatus("not confirmed");
  };

  return { inputRef, startTask, cancelTask, handleConfirm, status };
};
