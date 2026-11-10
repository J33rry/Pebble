"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/lib/api/messages";
import { useSocketEvent } from "./useSocket";

/** Keeps one chat's messages and call history fresh from realtime events. */
export function useMessageSocketEvents(chatId: string) {
  const queryClient = useQueryClient();

  useSocketEvent("message:new", (payload: Message) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    }
  });

  useSocketEvent("message:edit", (payload: Message) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    }
  });

  useSocketEvent("message:delete", (payload: { id: string; chatId: string }) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({
        queryKey: ["messages", chatId],
      });
    }
  });

  useSocketEvent("message:reaction", () => {
    queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
  });

  // Someone else read our messages — refresh so the ticks and seen-count update.
  useSocketEvent("message:status", (payload: { chatId?: string; messageIds?: string[] }) => {
    if (!payload.chatId || payload.chatId === chatId) {
      queryClient.invalidateQueries({
        queryKey: ["messages", chatId],
      });
    }
  });

  useSocketEvent("call:ended", () => {
    queryClient.invalidateQueries({ queryKey: ["calls", chatId] });
  });
}
