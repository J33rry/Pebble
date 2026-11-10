"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import type { Chat } from "@/lib/api/chats";
import type { User } from "@/lib/api/users";
import { ChatMediaPanel } from "../ChatMediaPanel";

export function ChatInfoPanel({
  chat,
  chatId,
  title,
  otherParticipant,
  otherUserOnline,
  showInfo,
  setShowInfo,
  onOpenMedia,
}: {
  chat: Chat;
  chatId: string;
  title: string;
  otherParticipant?: User | null;
  otherUserOnline: boolean;
  showInfo: boolean;
  setShowInfo: (open: boolean) => void;
  onOpenMedia: (url: string, type: "image" | "video") => void;
}) {
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();
  const isGroup = chat.type === "group";
  const memberCount = chat.participants?.length || 0;

  // Online members first, then admins, then by name.
  const sortedParticipants = [...(chat.participants || [])].sort((a, b) => {
    const aOnline = isOnline(a.userId);
    const bOnline = isOnline(b.userId);
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    if ((a.role === "admin") !== (b.role === "admin")) return a.role === "admin" ? -1 : 1;
    return (a.user?.displayName || "").localeCompare(b.user?.displayName || "");
  });

  return (
    <aside
      className={clsx(
        "flex flex-col gap-3 overflow-y-auto p-3 bg-bg xl:bg-surface-2/50",
        "absolute inset-y-0 right-0 z-30 w-full sm:w-[360px] shadow-[var(--shadow-lg)] xl:static xl:z-auto xl:w-[340px] xl:shrink-0 xl:shadow-none xl:border-l xl:border-border",
      )}
    >
      <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[26px] font-semibold text-fg tracking-tight">
            {isGroup ? "Group Info" : "Info"}
          </h3>
          <button
            onClick={() => setShowInfo(false)}
            className="p-1.5 rounded-lg text-accent hover:bg-surface-2 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(!isGroup || chat.description) && (
          <div className="mt-4 flex items-center gap-3">
            {!isGroup && (
              <Avatar
                src={otherParticipant?.avatarUrl}
                name={title}
                size="lg"
                showPresence
                isOnline={otherUserOnline}
              />
            )}
            <div className="min-w-0">
              {!isGroup && (
                <>
                  <p className="font-semibold text-fg truncate">{title}</p>
                  <p className="text-sm text-muted truncate">@{otherParticipant?.username}</p>
                </>
              )}
              {(isGroup ? chat.description : otherParticipant?.bio) && (
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {isGroup ? chat.description : otherParticipant?.bio}
                </p>
              )}
            </div>
          </div>
        )}

        <h4 className="mt-5 mb-2 text-lg font-semibold text-fg">Files</h4>
        <ChatMediaPanel chatId={chatId} enabled={showInfo} onOpenMedia={onOpenMedia} />
      </section>

      {isGroup && (
        <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-[22px] font-semibold text-fg tracking-tight mb-3">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </h3>
          <ul className="space-y-1">
            {sortedParticipants.map((p) => {
              const pUser = p.user;
              return (
                <li key={p.id} className="flex items-center gap-3.5 py-1.5">
                  <Avatar
                    src={pUser?.avatarUrl}
                    name={pUser?.displayName || pUser?.username}
                    size="md"
                    showPresence
                    isOnline={isOnline(p.userId)}
                  />
                  <p className="flex-1 min-w-0 text-[16px] font-medium text-fg truncate">
                    {p.userId === currentUser?.id ? "You" : pUser?.displayName}
                  </p>
                  {p.role === "admin" && <span className="text-sm text-accent">admin</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
