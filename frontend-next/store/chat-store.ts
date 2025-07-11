import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ToolCall {
  role: "user" | "tool" | "system" | "assistant";
  content: string | null;
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, string>;
  tool_call_error: boolean;
  metrics: {
    time: number;
  };
  created_at: number;
}

export interface ReasoningMessage {
  role: "user" | "tool" | "system" | "assistant";
  content: string | null;
  tool_call_id?: string;
  tool_name?: string;
  tool_args?: Record<string, string>;
  tool_call_error?: boolean;
  metrics?: {
    time: number;
  };
  created_at?: number;
}

export interface ReasoningSteps {
  title: string;
  action?: string;
  result: string;
  reasoning: string;
  confidence?: number;
  next_action?: string;
}

export interface Reference {
  content: string;
  meta_data: {
    chunk: number;
    chunk_size: number;
  };
  name: string;
}

export interface ReferenceData {
  query: string;
  references: Reference[];
  time?: number;
}

export interface ImageData {
  revised_prompt: string;
  url: string;
}

export interface VideoData {
  id: number;
  eta: number;
  url: string;
}

export interface AudioData {
  base64_audio?: string;
  mime_type?: string;
  url?: string;
  id?: string;
  content?: string;
  channels?: number;
  sample_rate?: number;
}

export interface ResponseAudio {
  id?: string;
  content?: string;
  transcript?: string;
  channels?: number;
  sample_rate?: number;
}

export interface ChatMessage {
  id: string; // use session id as message id
  role: "user" | "agent" | "system" | "tool";
  content: string;
  streamingError?: boolean;
  created_at: number;
  tool_calls?: ToolCall[];
  extra_data?: {
    reasoning_steps?: ReasoningSteps[];
    reasoning_messages?: ReasoningMessage[];
    references?: ReferenceData[];
  };
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  response_audio?: ResponseAudio;
}

export type ConfirmationRequest = {
  id: string;
  message: string;
};

type ChatRoom = {
  id: string;
  name: string;
  messages: ChatMessage[];
  streamingMessage: ChatMessage | null;

  // for confirmation
  confirmationRequests?: ConfirmationRequest[];

  status: "idle" | "loading" | "error";
};

type ChatStore = {
  chatRooms: ChatRoom[];
  addMessage: (message: ChatMessage, roomId: string) => void;
  setStatus: (roomId: string, status: ChatRoom["status"]) => void;
  updateStreamingMessage: (roomId: string, message: ChatMessage | null) => void;
  setConfirmationRequest: (
    roomId: string,
    request: ConfirmationRequest
  ) => void;
  removeConfirmationRequest?: (
    roomId: string,
    confirmationRequestId: string
  ) => void;
  clearConfirmationRequests?: (roomId: string) => void;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chatRooms: [
        {
          id: "temp_agent_id",
          name: "Agent Chat Room",
          messages: [],
          streamingMessage: null,
          status: "idle",
        },
        {
          id: "temp_team_id",
          name: "Team Chat Room",
          messages: [],
          streamingMessage: null,
          status: "idle",
        },
        {
          id: "temp_workflow_id",
          name: "Workflow Chat Room",
          messages: [],
          streamingMessage: null,
          status: "idle",
        },
      ],
      addMessage: (message, roomId) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room) {
            room.messages.push(message);
          }
          return { chatRooms: [...state.chatRooms] };
        }),

      updateStreamingMessage: (roomId, message) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room && message) {
            room.streamingMessage = message;
          } else {
            room ? (room.streamingMessage = null) : null;
          }
          return { chatRooms: [...state.chatRooms] };
        }),

      setConfirmationRequest: (roomId, request) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room) {
            if (request) {
              room.confirmationRequests = room.confirmationRequests || [];
              room.confirmationRequests.push(request);
            } else {
              room.confirmationRequests = [];
            }
          }
          return { chatRooms: [...state.chatRooms] };
        }),
      removeConfirmationRequest: (roomId, confirmationRequestId) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room && room.confirmationRequests) {
            room.confirmationRequests = room.confirmationRequests.filter(
              (request) => request.id !== confirmationRequestId
            );
          }
          return { chatRooms: [...state.chatRooms] };
        }),
      clearConfirmationRequests: (roomId) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room) {
            room.confirmationRequests = [];
          }
          return { chatRooms: [...state.chatRooms] };
        }),

      setStatus: (roomId, status) =>
        set((state) => {
          const room = state.chatRooms.find((room) => room.id === roomId);
          if (room) {
            room.status = status;
          }
          return { chatRooms: [...state.chatRooms] };
        }),
    }),

    {
      name: "chat-storage",
    }
  )
);
