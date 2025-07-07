"use client";

import {Messages, StreamingMessages} from "./messages";
import { StickToBottom } from "use-stick-to-bottom";
import ScrollToBottom from "./scroll-to-bottom";
import { useChatStore } from "@/store/chat-store";
import { ResponseMode } from "@/hook/use-handle-chat";

type MessageAreaProps = {
    chatRoomId: string;
    mode: ResponseMode;
};


const MessageArea: React.FC<MessageAreaProps> = ({ chatRoomId }) => {
  // Subscribe to the entire chatRooms array to ensure re-renders
  const chatRooms = useChatStore((state) => state.chatRooms);
  const messages = chatRooms?.find(room => room.id === chatRoomId)?.messages || [];

  return (
    <StickToBottom
      className="relative mb-4 flex max-h-[calc(100vh-64px)] min-h-0 flex-grow flex-col"
      resize="instant"
      initial="instant"
    >
      <StickToBottom.Content className="flex min-h-full flex-col justify-center">
        <div className="mx-auto w-full max-w-3xl space-y-9 px-4 pb-4">
          <Messages messages={messages} />
          <StreamingMessages /> 
        </div>
      </StickToBottom.Content>
      <ScrollToBottom />
    </StickToBottom>
  );
};

export default MessageArea;
