"use client";

import { Dispatch, KeyboardEvent, RefObject, SetStateAction, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chatsApi, type ChatParticipant } from "@/lib/api/chats";
import { useAuth } from "./useAuth";

interface UseMentionAutocompleteOptions {
  chatId: string;
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useMentionAutocomplete({
  chatId,
  content,
  setContent,
  textareaRef,
}: UseMentionAutocompleteOptions) {
  const { user: currentUser } = useAuth();

  // Mention autocomplete. `mentionAnchor` is the index of the '@' being typed.
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Already warm — ChatMain fetches this on the same key.
  const { data: chatData } = useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => chatsApi.getChatDetails(chatId),
  });

  // Only this chat's participants can be mentioned, matching the server.
  const mentionCandidates: ChatParticipant[] =
    mentionAnchor === null
      ? []
      : (chatData?.chat?.participants || [])
          .filter((p) => p.userId !== currentUser?.id)
          .filter((p) => {
            const q = mentionQuery.toLowerCase();
            if (!q) return true;
            return (
              (p.user?.username || "").toLowerCase().startsWith(q) ||
              (p.user?.displayName || "").toLowerCase().includes(q)
            );
          })
          .slice(0, 6);

  /** Detects an in-progress @mention immediately left of the caret. */
  const detectMention = (value: string, caret: number) => {
    const match = /(?:^|[^\w@])@([a-zA-Z0-9_]*)$/.exec(value.slice(0, caret));
    if (match) {
      setMentionAnchor(caret - match[1].length - 1);
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionAnchor(null);
    }
  };

  const applyMention = (p: ChatParticipant) => {
    if (mentionAnchor === null) return;
    const username = p.user?.username;
    if (!username) return;

    const caret = textareaRef.current?.selectionStart ?? content.length;
    const next = content.slice(0, mentionAnchor) + `@${username} ` + content.slice(caret);

    setContent(next);
    setMentionAnchor(null);

    // Put the caret just after the inserted mention.
    const pos = mentionAnchor + username.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  /** Returns true when the popover consumed the key. */
  const handleMentionKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionCandidates.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionCandidates.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyMention(mentionCandidates[mentionIndex]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMentionAnchor(null);
      return true;
    }

    return false;
  };

  return {
    candidates: mentionCandidates,
    activeIndex: mentionIndex,
    setActiveIndex: setMentionIndex,
    detectMention,
    applyMention,
    handleMentionKey,
  };
}
