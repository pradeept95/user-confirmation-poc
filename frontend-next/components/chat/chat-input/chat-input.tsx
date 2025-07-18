"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { ResponseMode, useHandleChat } from "@/hook/use-handle-chat";
import { useChatStore } from "@/store/chat-store";
import React, { useEffect } from "react";

export const TaskConfirmationRequest = ({
  chatRoomId,
  handleConfirm,
}: {
  chatRoomId: string;
  handleConfirm: (value: boolean) => void;
}) => {
  const chatRooms = useChatStore((state) => state.chatRooms);
  const confirmationRequests = chatRooms?.find(
    (room) => room.id === chatRoomId
  )?.confirmationRequests;

  if (!confirmationRequests || confirmationRequests.length === 0) {
    return "No confirmation requests";
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

type UserInputRequest = {
  chatRoomId: string;
  handleInputSubmit: (values: { [key: string]: string }) => void;
};

export const UserInputRequest: React.FC<UserInputRequest> = ({
  chatRoomId,
  handleInputSubmit,
}) => {
  const chatRooms = useChatStore((state) => state.chatRooms);
  const userInputRequests = chatRooms?.find(
    (room) => room.id === chatRoomId
  )?.userInputRequests;

  const [inputValues, setInputValues] = React.useState<{
    [key: string]: string;
  }>({});

  // useEffect(() => {
  //   setInputValues(
  //     (userInputRequests || []).reduce((acc: any, field) => {
  //       acc[field.name] = "";
  //       return acc;
  //     }, {})
  //   );
  // }, [userInputRequests]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    setInputValues((prev) => ({
      ...prev,
      [fieldName]: e.target.value,
    }));
  };

  if (!userInputRequests || userInputRequests.length === 0) {
    return "No user input requests";
  }

  return (
    <div
      style={{
        background: "#e3f2fd",
        border: "2px solid #2196F3",
        borderRadius: "8px",
        padding: 16,
        margin: 16,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 12, color: "#1565C0" }}>
        📝 Agent Requires Input
      </div>
      <div style={{ marginBottom: 12 }}>
        Please provide the following information:
      </div>
      {userInputRequests.map((field) => (
        <div key={field.name} style={{ margin: "12px 0" }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "500",
              color: "#1565C0",
            }}
          >
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
              fontSize: "14px",
            }}
            placeholder={`Enter ${field.description.toLowerCase()}...`}
          />
        </div>
      ))}
      <button
        onClick={() => handleInputSubmit(inputValues)}
        style={{
          backgroundColor: "#2196F3",
          marginTop: "12px",
        }}
      >
        📤 Submit Information
      </button>
    </div>
  );
};

type ChatInputProps = {
  chatRoomId: string;
  mode: ResponseMode;
};

const ChatInput: React.FC<ChatInputProps> = ({ chatRoomId, mode }) => {
  const {
    inputRef,
    startTask,
    cancelTask,
    handleConfirm,
    handleInputSubmit,
    status,
  } = useHandleChat(chatRoomId, mode);

  return (
    <div className="flex flex-col relative mx-auto mb-1 w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <TaskConfirmationRequest
        chatRoomId={chatRoomId}
        handleConfirm={handleConfirm}
      />
      <UserInputRequest
        chatRoomId={chatRoomId}
        handleInputSubmit={handleInputSubmit}
      />
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
