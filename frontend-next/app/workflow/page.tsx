"use client";

import ChatInput from "@/components/chat/chat-input";
import { MessageArea } from "@/components/chat/message-area";
import { Suspense } from "react";

const WorkflowPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-screen bg-background/80">
        <main className="relative m-1.5 flex flex-grow flex-col rounded-xl bg-background">
          <MessageArea chatRoomId="temp_workflow_id" mode="workflow" />
          <div className="sticky bottom-0 ml-9 px-4 pb-2">
            <ChatInput chatRoomId="temp_workflow_id" mode="workflow" />
          </div>
        </main>
      </div>
    </Suspense>
  );
};

export default WorkflowPage;
