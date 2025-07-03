"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePlaygroundStore } from "@/store";
import Icon from "@/components/icon";

const ChatInput = () => {
  const { chatInputRef } = usePlaygroundStore();

  return (
    <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      <Textarea
        placeholder={"Ask anything"}
        className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
        ref={chatInputRef}
      />
      <Button
        size="icon"
        className="rounded-xl bg-primary p-5 text-primaryAccent"
      >
        <Icon type="send" color="primaryAccent" />
      </Button>
    </div>
  );
};

export default ChatInput;
