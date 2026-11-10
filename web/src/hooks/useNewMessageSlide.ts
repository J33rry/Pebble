"use client";

import { RefObject, useLayoutEffect, useRef } from "react";
import type { Message } from "@/lib/api/messages";
import type { ChatWaterHandle } from "@/components/chats/ChatWater";

// How long a new message takes to slide up from the composer.
const SLIDE_MS = 520;

interface UseNewMessageSlideOptions {
  chatId: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  messagesData: { pages: { messages?: Message[] }[] } | undefined;
  isMessagesLoading: boolean;
  water?: RefObject<ChatWaterHandle | null>;
}

export function useNewMessageSlide({
  chatId,
  scrollRef,
  messagesData,
  isMessagesLoading,
  water,
}: UseNewMessageSlideOptions) {
  // Messages that arrive while the chat is open slide up from the composer,
  // rippling the water along the way. Whatever was there on open, and
  // older pages loaded by scrolling up, just appear.
  const seenRef = useRef<{ chatId: string; ids: Set<string>; latest: number } | null>(null);
  useLayoutEffect(() => {
    if (isMessagesLoading || !messagesData) return;
    const msgs = messagesData.pages.flatMap((page) => page.messages || []);
    const stamp = (m: Message) => new Date(m.createdAt).getTime();
    const latest = msgs.reduce((max, m) => Math.max(max, stamp(m)), 0);
    const seen = seenRef.current;
    if (!seen || seen.chatId !== chatId) {
      seenRef.current = { chatId, ids: new Set(msgs.map((m) => m.id)), latest };
      return;
    }
    const fresh = msgs.filter((m) => !seen.ids.has(m.id) && stamp(m) >= seen.latest);
    msgs.forEach((m) => seen.ids.add(m.id));
    seen.latest = Math.max(seen.latest, latest);
    if (!fresh.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const m of fresh) {
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${m.id}"]`);
      if (!row) continue;
      // Hidden until the next frame, by when the list has scrolled to the
      // bubble's final spot, so the slide can be measured from there.
      row.style.visibility = "hidden";
      requestAnimationFrame(() => {
        row.style.visibility = "";
        const list = scrollRef.current;
        if (!row.isConnected || !list) return;
        const bubble = row.querySelector<HTMLElement>("[data-bubble]") ?? row;
        // Slide up from the composer, entering under the list's bottom edge.
        const from = Math.max(
          list.getBoundingClientRect().bottom - bubble.getBoundingClientRect().top + 16,
          48,
        );
        row.animate([{ transform: `translateY(${from}px)` }, { transform: "translateY(0)" }], {
          duration: SLIDE_MS,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
        row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });

        // It drags a wake across the water as it travels, strongest at the
        // start, then a last ring where it comes to rest.
        const start = performance.now();
        let lastDrop = -Infinity;
        const wake = (now: number) => {
          if (!row.isConnected) return;
          const t = (now - start) / SLIDE_MS;
          if (t >= 1) {
            water?.current?.surface(bubble.getBoundingClientRect(), 0.7);
            return;
          }
          if (now - lastDrop > 55) {
            lastDrop = now;
            water?.current?.surface(bubble.getBoundingClientRect(), 0.25 + 0.6 * (1 - t));
          }
          requestAnimationFrame(wake);
        };
        requestAnimationFrame(wake);
      });
    }
  }, [messagesData, chatId, isMessagesLoading, water, scrollRef]);
}
