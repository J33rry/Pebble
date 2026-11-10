"use client";

import clsx from "clsx";
import { format } from "date-fns";
import { Check, CheckCheck, Eye } from "lucide-react";
import type { Message } from "@/lib/api/messages";
import { useAuth } from "@/hooks/useAuth";

/** Reactions on the left, seen-count and time on the right. */
export function MessageFooter({
  msg,
  isMe,
  isGroup,
  onToggleReaction,
}: {
  msg: Message;
  isMe: boolean;
  isGroup: boolean;
  onToggleReaction: (emoji: string) => void;
}) {
  const { user: currentUser } = useAuth();

  // Senders never mark their own message read, so every status row with a
  // readAt belongs to someone else: this is the "seen by" count.
  const readCount = msg.status?.filter((s) => s.readAt).length ?? 0;

  // Group reactions by emoji
  const reactionsMap = new Map<string, { count: number; me: boolean }>();
  msg.reactions?.forEach((r) => {
    const curr = reactionsMap.get(r.reaction) || { count: 0, me: false };
    if (r.userId === currentUser?.id) curr.me = true;
    curr.count++;
    reactionsMap.set(r.reaction, curr);
  });

  return (
    <div className="flex items-end justify-between gap-4 mt-1.5">
      <div className="flex flex-wrap gap-1.5">
        {Array.from(reactionsMap.entries()).map(([emoji, { count, me }]) => (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji)}
            className={clsx(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[14px] font-medium transition-colors",
              isMe
                ? me
                  ? "bg-white/30"
                  : "bg-white/15 hover:bg-white/25"
                : me
                  ? "bg-surface text-accent ring-1 ring-accent/50"
                  : "bg-surface text-fg hover:ring-1 hover:ring-border-strong",
            )}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        ))}
      </div>

      <div
        className={clsx(
          "flex items-center gap-1.5 text-[13px] whitespace-nowrap ml-auto",
          isMe ? "text-accent-fg/85" : "text-muted",
        )}
      >
        {/* Read count — only members other than the sender get a
                                    message_status row, so this is "how many have seen it". */}
        {isGroup && readCount > 0 && (
          <span className="flex items-center gap-1 mr-1.5" title={`Seen by ${readCount}`}>
            <Eye className="w-3.5 h-3.5" />
            {readCount}
          </span>
        )}

        <span>{format(new Date(msg.createdAt), "HH:mm")}</span>

        {isMe &&
          !isGroup &&
          (readCount > 0 ? (
            <CheckCheck className="w-4 h-4" aria-label="Read" />
          ) : (
            <Check className="w-4 h-4 opacity-70" aria-label="Sent" />
          ))}
      </div>
    </div>
  );
}
