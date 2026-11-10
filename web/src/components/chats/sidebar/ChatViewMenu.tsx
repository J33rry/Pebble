"use client";

import { useState } from "react";
import clsx from "clsx";
import { Archive, ChevronDown, Clock, Mail, User as UserIcon, Users } from "lucide-react";

export type ChatView = "recent" | "unread" | "dm" | "group" | "archived";

export const VIEWS: { value: ChatView; label: string; title: string; icon: typeof Clock }[] = [
  { value: "recent", label: "Recent", title: "Chats", icon: Clock },
  { value: "unread", label: "Unread", title: "Unread", icon: Mail },
  { value: "dm", label: "Direct", title: "Direct", icon: UserIcon },
  { value: "group", label: "Groups", title: "Groups", icon: Users },
  { value: "archived", label: "Archived", title: "Archived", icon: Archive },
];

export function ChatViewMenu({ view, onChange }: { view: ChatView; onChange: (view: ChatView) => void }) {
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const activeView = VIEWS.find((v) => v.value === view)!;

  return (
    <div className="relative">
      <button
        onClick={() => setIsViewMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] text-muted hover:text-fg hover:bg-surface-2 transition-colors"
      >
        {activeView.label}
        <ChevronDown className={clsx("h-4 w-4 transition-transform", isViewMenuOpen && "rotate-180")} />
      </button>
      {isViewMenuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsViewMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-30 w-40 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                onClick={() => {
                  onChange(v.value);
                  setIsViewMenuOpen(false);
                }}
                className={clsx(
                  "w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors",
                  view === v.value
                    ? "text-accent font-medium"
                    : "text-muted hover:text-fg hover:bg-surface-2",
                )}
              >
                <v.icon className="h-4 w-4" />
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
