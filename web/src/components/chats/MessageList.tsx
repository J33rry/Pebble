"use client";

import { Fragment, RefObject, useCallback, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Loader2, Smile } from "lucide-react";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMarkMessagesRead } from "@/hooks/useMarkMessagesRead";
import { useMessageListScroll } from "@/hooks/useMessageListScroll";
import { useMessageSocketEvents } from "@/hooks/useMessageSocketEvents";
import { useNewMessageSlide } from "@/hooks/useNewMessageSlide";
import { useTyping } from "@/hooks/useTyping";
import { callsApi } from "@/lib/api/calls";
import { chatsApi } from "@/lib/api/chats";
import { messagesApi, type Message } from "@/lib/api/messages";
import type { ChatWaterHandle } from "./ChatWater";
import { CallTimelineEntry } from "./message/CallTimelineEntry";
import { MessageBubble } from "./message/MessageBubble";
import { buildTimeline, previousMessage } from "./message/timeline";
import { TypingIndicator } from "./message/TypingIndicator";

const PAGE_SIZE = 50;

interface MessageListProps {
  chatId: string;
  water?: RefObject<ChatWaterHandle | null>;
}

export function MessageList({ chatId, water }: MessageListProps) {
  const { user: currentUser } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { typingUsers } = useTyping(chatId);

  // Already warm in the cache — ChatMain fetches this on the same key.
  const { data: chatData } = useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => chatsApi.getChatDetails(chatId),
  });
  const isGroup = chatData?.chat?.type === "group";

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"image" | "video">("image");

  const handleOpenMedia = (url: string, type: "image" | "video") => {
    setLightboxSrc(url);
    setLightboxType(type);
  };

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMessagesLoading,
  } = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({ pageParam }) => messagesApi.getMessages(chatId, pageParam, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pageMsgs = lastPage?.messages || [];
      if (pageMsgs.length < PAGE_SIZE) return undefined;
      return pageMsgs[pageMsgs.length - 1].id;
    },
  });

  const { data: callsData } = useQuery({
    queryKey: ["calls", chatId],
    queryFn: () => callsApi.getChatCallHistory(chatId),
  });

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isMessagesLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isMessagesLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const messagesList = messagesData?.pages.flatMap((page) => page.messages || []) || [];
  const timelineItems = buildTimeline(messagesList, callsData?.calls || []);

  useMarkMessagesRead(chatId, messagesData?.pages[0]?.messages);
  useMessageSocketEvents(chatId);
  const scrollRef = useMessageListScroll(chatId, timelineItems.length, isFetchingNextPage);
  useNewMessageSlide({ chatId, scrollRef, messagesData, isMessagesLoading, water });

  if (isMessagesLoading) {
    return <MessageListSkeleton />;
  }

  const prevMsgMap = new Map<string, Message>();
  messagesList.forEach((m) => prevMsgMap.set(m.id, m));

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-3 flex flex-col min-w-0 max-w-full relative z-0"
      ref={scrollRef}
    >
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4 shrink-0">
          {isFetchingNextPage ? (
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          ) : (
            <div className="h-6" />
          )}
        </div>
      )}

      {timelineItems.length === 0 && !hasNextPage ? (
        <div className="mt-auto text-center text-sm text-faint py-10 font-mono tracking-widest uppercase flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-dashed border-border text-muted">
            <Smile className="w-5 h-5 opacity-50" />
          </div>
          Beginning of conversation
        </div>
      ) : (
        <div className="flex flex-col mt-auto space-y-3">
          {timelineItems.map((item, index) => {
            const itemDate = new Date(item.timestamp);
            const showDateDivider =
              index === 0 || !isSameDay(itemDate, new Date(timelineItems[index - 1].timestamp));

            return (
              <Fragment key={item.type === "message" ? item.data.id : `call-${item.data.id}`}>
                {showDateDivider && (
                  <div className="sticky top-2 z-10 flex justify-center my-4 pointer-events-none">
                    <span className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-muted shadow-[var(--shadow-sm)] border border-border">
                      {format(itemDate, "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {item.type === "call" ? (
                  <CallTimelineEntry call={item.data} chatId={chatId} />
                ) : (
                  <MessageBubble
                    msg={item.data}
                    isMe={item.data.senderId === currentUser?.id}
                    showAvatar={previousMessage(timelineItems, index)?.senderId !== item.data.senderId}
                    chatId={chatId}
                    prevMsgMap={prevMsgMap}
                    onOpenMedia={handleOpenMedia}
                    isGroup={isGroup}
                  />
                )}
              </Fragment>
            );
          })}

          {typingUsers.length > 0 && <TypingIndicator />}
        </div>
      )}

      <MediaLightbox src={lightboxSrc} type={lightboxType} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
