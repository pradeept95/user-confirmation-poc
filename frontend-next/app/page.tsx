"use client";
import { ChatArea } from "@/components/chat";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-screen bg-background/80">
        <ChatArea />
      </div>
    </Suspense>
  );
}
