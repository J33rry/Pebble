"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Chat } from "@/lib/api/chats";
import type { Message } from "@/lib/api/messages";
import { useSocketEvent } from "./useSocket";

// Mirrors the server's ordering: pinned first, then most recently active.
function byPinnedThenRecent(a: Chat, b: Chat) {
  const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : null;
  const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : null;
  if (ap !== bp) {
    if (ap === null) return 1;
    if (bp === null) return -1;
    return bp - ap;
  }
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** Keeps the cached chat list in step with realtime events and the open chat. */
export function useChatListUpdates(data: unknown) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Other devices of this user changed a chat's pin/archive/mute state.
  useSocketEvent("chat:preferences", () => {
    queryClient.invalidateQueries({ queryKey: ["chats"] });
  });

  // Opening a chat marks it read server-side (MessageList), so clear the badge
  // straight away rather than waiting for the next list refetch.
  const openChatId = pathname.startsWith("/chats/") ? pathname.slice("/chats/".length) : null;

  useEffect(() => {
    if (!openChatId) return;
    queryClient.setQueryData(["chats"], (oldData: { chats: Chat[] } | undefined) => {
      if (!oldData?.chats) return oldData;
      if (!oldData.chats.some((c) => c.id === openChatId && (c.unreadCount || 0) > 0)) {
        return oldData;
      }
      return {
        ...oldData,
        chats: oldData.chats.map((c) => (c.id === openChatId ? { ...c, unreadCount: 0 } : c)),
      };
    });
  }, [openChatId, queryClient, data]);

  useSocketEvent<Message>("message:new", (newMessage) => {
    queryClient.setQueryData(["chats"], (oldData: { chats: Chat[] } | undefined) => {
      if (!oldData?.chats) return oldData;
      let found = false;
      const isOpen = pathname === `/chats/${newMessage.chatId}`;
      const updatedChats = oldData.chats.map((c: Chat) => {
        if (c.id === newMessage.chatId) {
          found = true;
          return {
            ...c,
            latestMessage: newMessage,
            updatedAt: newMessage.createdAt || new Date().toISOString(),
            // The open chat marks itself read, so only bump the others.
            unreadCount: isOpen ? c.unreadCount || 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      if (!found) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        return oldData;
      }

      updatedChats.sort(byPinnedThenRecent);
      return { ...oldData, chats: updatedChats };
    });
  });
}
