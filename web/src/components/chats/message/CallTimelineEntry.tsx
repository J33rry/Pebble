"use client";

import { useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Phone, PhoneMissed, Video } from "lucide-react";
import type { Call } from "@/lib/api/calls";
import { useAuth } from "@/hooks/useAuth";
import { useCallStore } from "@/hooks/useCall";

// An unanswered call still open after this long is shown as missed.
const MISSED_AFTER_MS = 5 * 60 * 1000;

export function CallTimelineEntry({ call, chatId }: { call: Call; chatId: string }) {
  const { user: currentUser } = useAuth();
  const { startCall } = useCallStore();
  // Read the clock once per mount, not on every render.
  const [renderedAt] = useState(() => Date.now());

  const isOutgoing = call.initiatorId === currentUser?.id;
  const isMissed =
    !call.endedAt && renderedAt - new Date(call.startedAt).getTime() > MISSED_AFTER_MS;
  const isOngoing = !call.endedAt && !isMissed;

  return (
    <div className="flex justify-center my-3">
      <div
        onClick={() => {
          if (!isOngoing) {
            startCall(chatId, call.type);
          }
        }}
        className={clsx(
          "flex items-center gap-4 px-5 py-3.5 rounded-3xl cursor-pointer hover:bg-surface-3/30 transition-all glass-panel shadow-md",
          isMissed ? "border-danger/30 hover:border-danger/50" : "border-border hover:border-accent/30",
        )}
      >
        <div
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            isMissed ? "bg-danger/15 text-danger" : "bg-accent/15 text-accent",
          )}
        >
          {isMissed ? (
            <PhoneMissed className="w-5 h-5" />
          ) : call.type === "video" ? (
            <Video className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className={clsx("text-sm font-bold tracking-tight", isMissed ? "text-danger" : "text-fg")}>
            {isOutgoing ? "Outgoing" : "Incoming"} {call.type === "video" ? "Video" : "Audio"} Call
          </p>
          <p className="text-[11px] text-muted font-mono mt-0.5 tracking-wider">
            {isOngoing ? "Ongoing..." : isMissed ? "Missed" : "Ended"} •{" "}
            {format(new Date(call.startedAt), "HH:mm")}
          </p>
        </div>
      </div>
    </div>
  );
}
