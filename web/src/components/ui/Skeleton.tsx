"use client";

import React from "react";
import clsx from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx("animate-shimmer rounded-lg bg-surface-2", className)}
      {...props}
    />
  );
}

// Varied widths so the placeholder reads as a list of real conversations.
const CHAT_ROWS = [
  { title: "w-32", preview: "w-44" },
  { title: "w-24", preview: "w-36" },
  { title: "w-40", preview: "w-48" },
  { title: "w-28", preview: "w-32" },
  { title: "w-36", preview: "w-44" },
  { title: "w-20", preview: "w-40" },
  { title: "w-32", preview: "w-28" },
  { title: "w-28", preview: "w-44" },
];

export function ChatListSkeleton() {
  return (
    <div role="status" aria-label="Loading chats" className="space-y-0.5">
      {CHAT_ROWS.map(({ title, preview }, i) => (
        <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
          <Skeleton className="w-16 h-16 rounded-[30%] shrink-0" />
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className={clsx("h-[18px] max-w-[70%]", title)} />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
            <Skeleton className={clsx("h-3.5 max-w-full", preview)} />
          </div>
        </div>
      ))}
    </div>
  );
}

const MESSAGE_ROWS = [
  { mine: false, size: "w-44 sm:w-64 h-11" },
  { mine: false, size: "w-56 sm:w-96 h-[68px]" },
  { mine: true, size: "w-40 sm:w-56 h-11" },
  { mine: false, size: "w-36 sm:w-48 h-11" },
  { mine: true, size: "w-60 sm:w-[420px] h-[68px]" },
  { mine: true, size: "w-32 sm:w-40 h-11" },
  { mine: false, size: "w-52 sm:w-80 h-[92px]" },
  { mine: true, size: "w-48 sm:w-72 h-11" },
];

export function MessageListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading messages"
      className="flex-1 overflow-hidden px-4 md:px-6 py-3 flex flex-col min-w-0 relative z-0"
    >
      <div className="flex flex-col mt-auto space-y-3">
        <Skeleton className="h-4 w-24 rounded-full self-center" />
        {MESSAGE_ROWS.map(({ mine, size }, i) => (
          <div
            key={i}
            className={clsx(
              "flex items-center gap-3 sm:gap-4 max-w-[90%] sm:max-w-[80%]",
              mine && "self-end"
            )}
          >
            {!mine && <Skeleton className="w-14 h-14 rounded-[30%] shrink-0" />}
            <Skeleton className={clsx("rounded-[18px] max-w-full", size)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// The whole conversation pane, for when the chat itself hasn't loaded yet.
export function ChatMainSkeleton() {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 shrink-0">
        <div className="space-y-2 min-w-0">
          <Skeleton className="h-7 md:h-8 w-40 md:w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <Skeleton className="w-11 h-11 rounded-xl" />
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
      </div>
      <MessageListSkeleton />
      <div className="px-4 md:px-6 pb-4 pt-2 shrink-0">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
