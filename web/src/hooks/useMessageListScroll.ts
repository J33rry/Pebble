"use client";

import { useEffect, useRef } from "react";

/** Scroll behaviour for the message list; returns the ref for the scroller. */
export function useMessageListScroll(chatId: string, itemCount: number, isFetchingOlder: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const prevScrollHeightRef = useRef<number>(0);

  // Initial scroll to bottom & scroll on new message
  useEffect(() => {
    if (scrollRef.current && itemCount > 0) {
      if (isInitialLoadRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        isInitialLoadRef.current = false;
      } else {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }
  }, [chatId, itemCount]);

  // Reset initial load flag when switching chats
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [chatId]);

  // Preserve scroll position when loading older pages
  useEffect(() => {
    if (isFetchingOlder && scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
    }
  }, [isFetchingOlder]);

  useEffect(() => {
    if (!isFetchingOlder && prevScrollHeightRef.current && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        scrollRef.current.scrollTop += diff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [isFetchingOlder]);

  return scrollRef;
}
