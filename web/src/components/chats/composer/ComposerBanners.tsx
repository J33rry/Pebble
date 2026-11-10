"use client";

import { X } from "lucide-react";
import type { Message } from "@/lib/api/messages";

export function ReplyBanner({ message, onCancel }: { message: Message; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
      <div className="flex flex-col min-w-0 pr-4 border-l-[3px] border-accent pl-3">
        <span className="text-xs font-semibold text-accent">
          Replying to {message.sender?.displayName || "User"}
        </span>
        <span className="text-xs text-muted truncate mt-0.5">{message.content || "Media attachment"}</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-full text-muted hover:text-fg hover:bg-surface-3 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function EditBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
      <div className="flex flex-col min-w-0 border-l-[3px] border-accent pl-3">
        <span className="text-xs font-semibold text-accent">Editing Message</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-full text-muted hover:text-fg hover:bg-surface-3 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
