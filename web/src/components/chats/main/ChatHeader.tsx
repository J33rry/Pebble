"use client";

import { Dispatch, SetStateAction, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, MoreVertical, Phone, Settings, Video } from "lucide-react";
import { useCallStore } from "@/hooks/useCall";
import { formatLastSeen } from "@/lib/utils/presence";

export function ChatHeader({
  chatId,
  title,
  isGroup,
  memberCount,
  onlineCount,
  otherUserOnline,
  otherUserLastSeen,
  showInfo,
  setShowInfo,
  onOpenSettings,
}: {
  chatId: string;
  title: string;
  isGroup: boolean;
  memberCount: number;
  onlineCount: number;
  otherUserOnline: boolean;
  otherUserLastSeen: Parameters<typeof formatLastSeen>[0];
  showInfo: boolean;
  setShowInfo: Dispatch<SetStateAction<boolean>>;
  onOpenSettings: () => void;
}) {
  const { callState, startCall } = useCallStore();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/" className="md:hidden p-2 -ml-2 text-muted hover:text-fg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button onClick={() => setShowInfo(true)} className="min-w-0 text-left">
          <h2 className="text-[22px] md:text-[28px] font-semibold text-fg leading-tight tracking-tight truncate">
            {title}
          </h2>
          <p className="text-[16px] text-muted truncate">
            {isGroup ? (
              <>
                {memberCount} member{memberCount === 1 ? "" : "s"}
                {onlineCount > 0 && `, ${onlineCount} online`}
              </>
            ) : otherUserOnline ? (
              <span className="text-success">Online</span>
            ) : (
              formatLastSeen(otherUserLastSeen)
            )}
          </p>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-muted">
        <button
          onClick={() => startCall(chatId, "audio")}
          disabled={callState !== "idle"}
          className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Start voice call"
        >
          <Phone className="w-6 h-6" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => startCall(chatId, "video")}
          disabled={callState !== "idle"}
          className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Start video call"
        >
          <Video className="w-6 h-6" strokeWidth={1.8} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors"
            title="More"
          >
            <MoreVertical className="w-6 h-6" strokeWidth={1.8} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 w-48 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
                <button
                  onClick={() => {
                    setShowInfo((v) => !v);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  {showInfo ? "Hide info" : isGroup ? "Group info" : "Contact info"}
                </button>
                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Chat settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
