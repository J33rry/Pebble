import clsx from "clsx";
import type { Message } from "@/lib/api/messages";

export function RepliedMessagePreview({ repliedTo, isMe }: { repliedTo: Message; isMe: boolean }) {
  return (
    <div
      className={clsx(
        "mb-3 p-3 rounded-2xl text-xs border-l-[3px] max-h-20 overflow-hidden relative",
        isMe ? "bg-white/15 border-white/60 text-accent-fg/90" : "bg-surface border-accent text-muted",
      )}
    >
      <p
        className={clsx("font-bold text-[11px] mb-1 tracking-wide", isMe ? "text-accent-fg" : "text-accent")}
      >
        {repliedTo.sender?.displayName || "User"}
      </p>
      <p className="truncate opacity-90 font-medium">{repliedTo.content || "Media attachment"}</p>
    </div>
  );
}
