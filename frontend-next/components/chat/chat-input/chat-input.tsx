"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { ResponseMode, useHandleChat } from "@/hook/use-handle-chat";
import { useChatStore } from "@/store/chat-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import React from "react";

export const TaskConfirmationRequest = ({
  handleConfirm,
}: {
  handleConfirm: (value: boolean) => void;
}) => {
  const chatRooms = useChatStore((state) => state.chatRooms);
  const confirmationRequests =
    chatRooms?.find((room) => room.id === "temp_agent_id")
      ?.confirmationRequests || [];

  if (!confirmationRequests || confirmationRequests.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl mb-4 p-3 bg-white border border-gray-200 rounded-md">
      <p className="text-sm text-secondary mb-3">
        {confirmationRequests[0].message ||
          "Do you want to proceed with this action?"}
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => handleConfirm(true)}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Yes, Continue
        </Button>
        <Button
          onClick={() => handleConfirm(false)}
          size="sm"
          variant="outline"
        >
          No, Cancel
        </Button>
      </div>
    </div>
  );
};

type ChatInputProps = {
  chatRoomId: string;
  mode: ResponseMode;
};

const ChatInput: React.FC<ChatInputProps> = ({ chatRoomId, mode }) => {
  const { inputRef, startTask, cancelTask, handleConfirm, status } =
    useHandleChat(chatRoomId, mode);

  return (
    <div className="flex flex-col relative mx-auto mb-1 w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <TaskConfirmationRequest handleConfirm={handleConfirm} />
      <div className="flex w-full border border-accent bg-primaryAccent  text-sm text-primary focus-within:border-accent">
        <Textarea
          placeholder={"Ask anything"}
          className="w-full border-0 outline-none resize-none bg-transparent px-4 m-0 appearance-none shadow-none focus:outline-none focus:ring-0 focus:border-0"
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
          className="rounded-md size-8"
          onClick={() => {
            if (status === "idle") {
              startTask();
            } else {
              cancelTask();
            }
          }}
          variant={status === "idle" ? "default" : "destructive"}
        >
          <span className="sr-only">
            {status === "idle" ? "Send message" : "Cancel message"}
          </span>

          <Icon
            type={status === "idle" ? "send" : "cancel"}
            color="primaryAccent"
            className="size-4"
          />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
