import type { PlaygroundChatMessage } from "@/types/app-types";

import { AgentMessage, UserMessage } from "./chat-message-item";
import Tooltip from "@/components/tooltip";
import { memo } from "react";
import {
  ToolCallProps,
  ReasoningStepProps,
  ReasoningProps,
  ReferenceData,
  Reference,
} from "@/types/app-types";
import React, { type FC } from "react";
import ChatBlankState from "./chat-blank-state";
import Icon from "@/components/icon";
import { useChatStore } from "@/store/chat-store";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MarkdownRenderer from "@/components/typography/markdown-renderer";
import {
  MorphingPopover,
  MorphingPopoverContent,
  MorphingPopoverTrigger,
} from "@/components/ui/morphing-popover";
import { Pill, PillStatus } from "@/components/ui/pill";
import { CheckCircleIcon, MinusCircleIcon } from "lucide-react";

interface MessageListProps {
  messages: PlaygroundChatMessage[];
}

interface MessageWrapperProps {
  message: PlaygroundChatMessage;
  isLastMessage: boolean;
}

interface ReferenceProps {
  references: ReferenceData[];
}

interface ReferenceItemProps {
  reference: Reference;
}

const ReferenceItem: FC<ReferenceItemProps> = ({ reference }) => (
  <div className="relative flex h-[63px] w-[190px] cursor-default flex-col justify-between overflow-hidden rounded-md bg-background-secondary p-3 transition-colors hover:bg-background-secondary/80">
    <p className="text-sm font-medium text-primary">{reference.name}</p>
    <p className="truncate text-xs text-primary/40">{reference.content}</p>
  </div>
);

const References: FC<ReferenceProps> = ({ references }) => (
  <div className="flex flex-col gap-4">
    {references.map((referenceData, index) => (
      <div
        key={`${referenceData.query}-${index}`}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-3">
          {referenceData.references.map((reference, refIndex) => (
            <ReferenceItem
              key={`${reference.name}-${reference.meta_data.chunk}-${refIndex}`}
              reference={reference}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const AgentMessageWrapper = ({ message }: MessageWrapperProps) => {
  return (
    <div className="flex flex-col gap-y-9">
      {message.extra_data?.reasoning_steps &&
        message.extra_data.reasoning_steps.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">Reasoning</p>}
              side="top"
            >
              <Icon type="reasoning" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-xs uppercase">Reasoning</p>
              <Reasonings reasoning={message.extra_data.reasoning_steps} />
            </div>
          </div>
        )}
      {message.extra_data?.references &&
        message.extra_data.references.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">References</p>}
              side="top"
            >
              <Icon type="references" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3">
              <References references={message.extra_data.references} />
            </div>
          </div>
        )}
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="flex items-start gap-3">
          <Tooltip
            delayDuration={0}
            content={<p className="text-accent">Tool Calls</p>}
            side="top"
          >
            <Icon
              type="hammer"
              className="rounded-lg bg-background-secondary p-1"
              size="sm"
              color="secondary"
            />
          </Tooltip>

          <div className="flex flex-wrap gap-2">
            {message.tool_calls.map((toolCall, index) => (
              <ToolComponent
                key={
                  toolCall.tool_call_id ||
                  `${toolCall.tool_name}-${toolCall.created_at}-${index}`
                }
                tools={toolCall}
              />
            ))}
          </div>
        </div>
      )}
      <AgentMessage message={message} />
    </div>
  );
};
const Reasoning: FC<ReasoningStepProps> = ({ index, stepTitle }) => (
  <div className="flex items-center gap-2 text-secondary w-full">
    <div className="flex h-[20px] items-center rounded-md bg-background-secondary p-2">
      <p className="text-xs">STEP {index + 1}</p>
    </div>
    <p className="text-xs">{stepTitle}</p>
  </div>
);
const Reasonings: FC<ReasoningProps> = ({ reasoning }) => (
  <Accordion
    type="single"
    collapsible
    className="flex flex-col items-start justify-center gap-2 w-full"
  >
    {reasoning.map((reasoning, index) => (
      <AccordionItem
        value={reasoning.title + index}
        key={`${reasoning.title}-${reasoning.action}-${index}`}
        className="w-full border-none"
      >
        <AccordionTrigger className="w-full py-1">
          <Reasoning stepTitle={reasoning.title} index={index} />
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance px-4 my-4">
          <MarkdownRenderer>{reasoning.reasoning}</MarkdownRenderer>
          <i>{reasoning.action}</i>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const ToolComponent = memo(({ tools }: ToolCallProps) => (
  <MorphingPopover>
    <MorphingPopoverTrigger> 
        <Pill variant={"outline"} className="uppercase">
          <PillStatus>
            {(tools?.tool_call_error ? (
              <MinusCircleIcon size={12} className="text-rose-500" />
            ) : (
              <CheckCircleIcon size={12} className="text-emerald-500" />
            ))}
          </PillStatus>
          {tools.tool_name}
        </Pill> 
    </MorphingPopoverTrigger>
    <MorphingPopoverContent className="w-[400px] p-4 shadow-lg z-50 max-h-[400px] overflow-y-auto bg-background-secondary rounded-xl bg-muted">
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-primary mb-1">Arguments</h4>
        <div className="bg-muted p-2 rounded text-xs text-secondary whitespace-pre-wrap break-all">
          {tools.tool_args && typeof tools.tool_args === "object" ? (
            <pre>{JSON.stringify(tools.tool_args, null, 2)}</pre>
          ) : (
            <span>{tools.tool_args}</span>
          )}
        </div>
        {tools.tool_args?.description && (
          <p className="mt-2 text-xs text-accent">
            {tools.tool_args.description}
          </p>
        )}
      </div>
      {tools.content && (
        <div>
          <h4 className="text-sm font-semibold text-primary mb-1">
            Tool Result
          </h4>
          <div className="bg-background p-2 rounded text-xs text-secondary whitespace-pre-wrap break-all">
            {tools.content}
          </div>
        </div>
      )}
    </MorphingPopoverContent>
  </MorphingPopover>
));
ToolComponent.displayName = "ToolComponent";

export const StreamingMessages = () => {
  const streamingMessage = useChatStore(
    (state) =>
      state.chatRooms.find((room) => room.id === "temp_agent_id")
        ?.streamingMessage || null
  );

  if (!streamingMessage) {
    return null;
  }

  return (
    <AgentMessageWrapper message={streamingMessage} isLastMessage={true} />
  );
};

export const Messages = ({ messages }: MessageListProps) => {
  if (messages.length === 0) {
    return <ChatBlankState />;
  }

  return (
    <>
      {messages.map((message, index) => {
        const key = `${message.role}-${message.created_at}-${index}`;
        const isLastMessage = index === messages.length - 1;

        if (message.role === "agent") {
          return (
            <AgentMessageWrapper
              key={key}
              message={message}
              isLastMessage={isLastMessage}
            />
          );
        }
        return <UserMessage key={key} message={message} />;
      })}
    </>
  );
};
