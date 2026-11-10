"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useState } from "react";
import { MessageList } from "./MessageList";
import { ChatWater, ChatWaterHandle } from "./ChatWater";
import { MessageComposer } from "./MessageComposer";
import { ActiveCall } from "../calls/ActiveCall";
import { useCallStore } from "@/hooks/useCall";
import { ChatSettingsModal } from "./ChatSettingsModal";
import { ChatMainSkeleton } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";
import { ChatHeader } from "./main/ChatHeader";
import { ChatInfoPanel } from "./main/ChatInfoPanel";
import { MediaLightbox } from "@/components/ui/MediaLightbox";

interface ChatMainProps {
  chatId: string;
}

export function ChatMain({ chatId }: ChatMainProps) {
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  // The info column sits beside the chat on wide screens, so start with it
  // open there; narrower layouts overlay it and only show it on request.
  const [showInfo, setShowInfo] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
  );
  const [showSettings, setShowSettings] = useState(false);
  const waterRef = useRef<ChatWaterHandle | null>(null);
  const [infoLightbox, setInfoLightbox] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);
  const { callState, activeCall, livekitToken, livekitUrl } = useCallStore();

  const isInCall = (callState === "connecting" || callState === "connected") && activeCall?.chatId === chatId;

  const { data, isLoading } = useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => chatsApi.getChatDetails(chatId),
  });
  const chat = data?.chat;

  if (isLoading) {
    return <ChatMainSkeleton />;
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-muted text-sm">
        Conversation not found
      </div>
    );
  }

  const isGroup = chat.type === "group";
  const otherParticipant = !isGroup
    ? chat.participants?.find((p) => p.userId !== currentUser?.id)?.user
    : null;
  const title = isGroup
    ? chat.name || "Unnamed Group"
    : otherParticipant?.displayName || "Unknown User";

  const otherUserOnline = !isGroup && otherParticipant ? isOnline(otherParticipant.id) : false;
  const otherUserLastSeen = !isGroup && otherParticipant ? (getLastSeen(otherParticipant.id) || otherParticipant.lastSeenAt) : null;

  const myRole = chat.participants?.find((p) => p.userId === currentUser?.id)?.role;
  const memberCount = chat.participants?.length || 0;
  const onlineCount = chat.participants?.filter((p) => isOnline(p.userId)).length || 0;

  return (
    <div className="flex-1 flex h-full relative overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col h-full relative isolate">
        <ChatWater handleRef={waterRef} />
        {isInCall && livekitToken && livekitUrl && (
          <ActiveCall
            token={livekitToken}
            serverUrl={livekitUrl}
            callType={activeCall!.type}
            isGroup={isGroup}
            canEndForEveryone={
              !isGroup || activeCall!.initiatorId === currentUser?.id || myRole === "admin"
            }
          />
        )}

        <ChatHeader
          chatId={chatId}
          title={title}
          isGroup={isGroup}
          memberCount={memberCount}
          onlineCount={onlineCount}
          otherUserOnline={otherUserOnline}
          otherUserLastSeen={otherUserLastSeen}
          showInfo={showInfo}
          setShowInfo={setShowInfo}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Message List Area */}
        <MessageList chatId={chatId} water={waterRef} />

        {/* Composer Area */}
        <MessageComposer chatId={chatId} />
      </div>

      {showInfo && (
        <ChatInfoPanel
          chat={chat}
          chatId={chatId}
          title={title}
          otherParticipant={otherParticipant}
          otherUserOnline={otherUserOnline}
          showInfo={showInfo}
          setShowInfo={setShowInfo}
          onOpenMedia={(url, type) => setInfoLightbox({ url, type })}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettingsModal chatId={chatId} onClose={() => setShowSettings(false)} />
      )}

      {/* Lightbox for media opened from the Shared panel */}
      <MediaLightbox
        src={infoLightbox?.url || null}
        type={infoLightbox?.type || "image"}
        onClose={() => setInfoLightbox(null)}
      />
    </div>
  );
}
