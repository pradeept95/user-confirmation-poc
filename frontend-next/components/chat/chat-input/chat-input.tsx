"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button"; 
import Icon from "@/components/icon";
import { ResponseMode, useHandleChat } from "@/hook/use-handle-chat";
import { useChatStore } from "@/store/chat-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import React from "react";

export const TaskConfirmationRequest = ({ handleConfirm }: { handleConfirm: (value: boolean) => void }) => {
  // Subscribe to the entire chatRooms array to ensure re-renders
  const chatRooms = useChatStore((state) => state.chatRooms);
  const confirmationRequests = chatRooms?.find(room => room.id === "temp_agent_id")?.confirmationRequests || [];

  if (!confirmationRequests || confirmationRequests.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl mb-4">
      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <div className="ml-2">
          <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Agent Confirmation Required
          </div>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300 mb-4">
            {confirmationRequests[0].message || "Do you want to proceed with this action?"}
          </AlertDescription>
          <div className="flex gap-2">
            <Button
              onClick={() => handleConfirm(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Yes, Continue
            </Button>
            <Button
              onClick={() => handleConfirm(false)}
              size="sm"
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-1" />
              No, Cancel
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

type ChatInputProps = {
  chatRoomId: string;
  mode: ResponseMode;
};

const ChatInput: React.FC<ChatInputProps> = ({ chatRoomId, mode }) => {
  const { inputRef, startTask, cancelTask, handleConfirm, status } = useHandleChat(chatRoomId, mode);

  return (
    <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <TaskConfirmationRequest handleConfirm={handleConfirm} />
      <Textarea
        placeholder={"Ask anything"}
        className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
        ref={inputRef}
        onKeyDown={(e) => {
          // check for enter and not shift enter, if enter send message
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (status === "idle") {
              startTask();
            } else {
              cancelTask();
            }
          }
        }}
      />
      <Button
        size="icon"
        className="rounded-xl"
        onClick={() => {
          if (status === "idle") {
            startTask();
          } else {
            cancelTask();
          }
        }}
      >
        <span className="sr-only">
          {status === "idle" ? "Send message" : "Cancel message"}
        </span>

        <Icon type={status === "idle" ? "send" : "cancel"} color="primaryAccent" />
      </Button>
    </div>
  );
};

export default ChatInput;
