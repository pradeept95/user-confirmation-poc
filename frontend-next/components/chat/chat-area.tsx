"use client";

import ChatInput from "./chat-input";
import { MessageArea } from "./message-area";

const ChatArea = () => {
  return (
    <main className="relative m-1.5 flex flex-grow flex-col rounded-xl bg-background">
      <MessageArea chatRoomId="test" mode="agent" />
      <div className="sticky bottom-0 ml-9 px-4 pb-2">
        <ChatInput chatRoomId="test" mode="agent" />
      </div>
    </main>
  );
};

export default ChatArea;
