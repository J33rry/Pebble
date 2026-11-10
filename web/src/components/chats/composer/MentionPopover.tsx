"use client";

import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import type { ChatParticipant } from "@/lib/api/chats";

export function MentionPopover({
  candidates,
  activeIndex,
  onHover,
  onSelect,
}: {
  candidates: ChatParticipant[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (participant: ChatParticipant) => void;
}) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 py-1 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] z-40 overflow-hidden">
      {candidates.map((p, i) => (
        <button
          key={p.id}
          type="button"
          // onMouseDown, not onClick: onClick fires after the textarea
          // blurs and the popover has already closed.
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(p);
          }}
          onMouseEnter={() => onHover(i)}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
            i === activeIndex ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2",
          )}
        >
          <Avatar src={p.user?.avatarUrl} name={p.user?.displayName || p.user?.username} size="sm" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-fg truncate">{p.user?.displayName}</span>
            <span className="block text-[10px] text-muted truncate">@{p.user?.username}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
