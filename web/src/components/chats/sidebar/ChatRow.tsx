"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  PinOff,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import type { Chat, ChatPreferences } from "@/lib/api/chats";
import { chatTitle, otherParticipant } from "@/lib/utils/chatDisplay";
import { shortAgo } from "@/lib/utils/time";

// Preview line: who said it (in groups / when it was you), then what.
function renderPreview(chat: Chat, sentByMe: boolean) {
  const msg = chat.latestMessage;
  if (!msg) return <span className="italic text-faint">No messages yet</span>;

  let body: React.ReactNode = msg.content || "Message";
  if (msg.isDeleted) body = <span className="italic">Message deleted</span>;
  else if (msg.type === "audio")
    body = (
      <span className="inline-flex items-center gap-1 text-accent">
        <Mic className="w-4 h-4" />
        Voice message
      </span>
    );
  else if (msg.type === "image")
    body = (
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="w-4 h-4" />
        {msg.content || "Photo"}
      </span>
    );
  else if (msg.type === "video")
    body = (
      <span className="inline-flex items-center gap-1">
        <Video className="w-4 h-4" />
        {msg.content || "Video"}
      </span>
    );
  else if (msg.type === "file")
    body = (
      <span className="inline-flex items-center gap-1">
        <Paperclip className="w-4 h-4" />
        {msg.content || "Attachment"}
      </span>
    );
  else if ((msg.type as string) === "call")
    body = (
      <span className="inline-flex items-center gap-1">
        <Phone className="w-4 h-4" />
        Call
      </span>
    );

  const who = sentByMe ? "You" : chat.type === "group" ? msg.sender?.displayName?.split(" ")[0] : null;

  return (
    <>
      {who && <span className="text-accent">{who}: </span>}
      {body}
    </>
  );
}

export function ChatRow({
  chat,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  setPref,
}: {
  chat: Chat;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  setPref: (chatId: string, prefs: ChatPreferences) => void;
}) {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();

  const isActive = pathname === `/chats/${chat.id}`;
  const title = chatTitle(chat, currentUser?.id);
  const isGroup = chat.type === "group";
  const otherUser = otherParticipant(chat, currentUser?.id);
  const unread = chat.unreadCount || 0;
  const mentions = chat.mentionCount || 0;
  const isPinned = !!chat.pinnedAt;
  const isArchived = !!chat.archivedAt;
  const latest = chat.latestMessage;
  const sentByMe = !!latest && latest.senderId === currentUser?.id;
  const seen = sentByMe && !!latest?.status?.some((st) => st.readAt);

  return (
    <li key={chat.id} className="relative group">
      <Link
        href={`/chats/${chat.id}`}
        className={clsx(
          "flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors",
          isActive ? "bg-surface-2" : "hover:bg-surface-2/60",
        )}
      >
        <Avatar
          src={isGroup ? chat.avatarUrl : otherUser?.avatarUrl}
          name={title}
          size="xl"
          isGroup={isGroup}
          showPresence={!isGroup}
          isOnline={isOnline(otherUser?.id)}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="flex-1 min-w-0 flex items-center gap-1.5 text-[17px] font-semibold text-fg">
              {chat.isMuted && <BellOff className="w-3.5 h-3.5 shrink-0 text-faint" />}
              <span className="truncate">{title}</span>
              {seen && <CheckCheck className="w-4 h-4 shrink-0 text-accent" aria-label="Read" />}
            </p>
            <span className="text-[13px] text-muted whitespace-nowrap">{shortAgo(chat.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className={clsx("text-[14px] truncate flex-1", unread > 0 ? "text-fg" : "text-muted")}>
              {renderPreview(chat, sentByMe)}
            </p>
            {/* A mention cuts through a muted chat, so it gets its
                            own accent marker regardless of mute state. */}
            {mentions > 0 && (
              <span
                className="shrink-0 w-[22px] h-[22px] rounded-full bg-accent text-accent-fg text-[12px] font-semibold flex items-center justify-center"
                title={`${mentions} mention${mentions === 1 ? "" : "s"}`}
              >
                @
              </span>
            )}
            {unread > 0 && (
              <span
                className={clsx(
                  "shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-semibold flex items-center justify-center",
                  chat.isMuted && mentions === 0 ? "bg-surface-3 text-muted" : "bg-danger text-danger-fg",
                )}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            {isPinned && <Pin className="w-4 h-4 shrink-0 text-accent fill-accent" aria-label="Pinned" />}
          </div>
        </div>
      </Link>

      {/* Pin / archive / mute. Outside the Link so clicks don't navigate. */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleMenu();
        }}
        className={clsx(
          "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-surface shadow-[var(--shadow-sm)] transition-opacity z-10",
          "text-muted hover:text-fg",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
        )}
        title="Chat options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => onCloseMenu()} />
          <div className="absolute right-2 top-[calc(50%+20px)] z-30 w-44 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
            <button
              onClick={() => setPref(chat.id, { pinned: !isPinned })}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {isPinned ? "Unpin" : "Pin to top"}
            </button>
            <button
              onClick={() => setPref(chat.id, { muted: !chat.isMuted })}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {chat.isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {chat.isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={() => setPref(chat.id, { archived: !isArchived })}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              {isArchived ? "Unarchive" : "Archive"}
            </button>
          </div>
        </>
      )}
    </li>
  );
}
