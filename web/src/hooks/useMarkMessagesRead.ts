"use client";

import { useEffect } from "react";
import { messagesApi, type Message } from "@/lib/api/messages";
import { useAuth } from "./useAuth";

/** Marks the newest page's unread messages as read once they're on screen. */
export function useMarkMessagesRead(chatId: string, latestPage: Message[] | undefined) {
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const firstPageMsgs = latestPage || [];
    if (firstPageMsgs.length) {
      const unreadMessages = firstPageMsgs.filter(
        (m) =>
          m.senderId !== currentUser?.id &&
          (!m.status || !m.status.some((s) => s.userId === currentUser?.id && s.readAt)),
      );
      if (unreadMessages.length > 0) {
        const idsToMark = unreadMessages.slice(0, 100).map((m) => m.id);
        messagesApi.markAsRead(chatId, idsToMark).catch(console.error);
      }
    }
  }, [latestPage, chatId, currentUser?.id]);
}
