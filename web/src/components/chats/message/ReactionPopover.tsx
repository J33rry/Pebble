"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const GAP = 12;
const EDGE = 8;

/**
 * Floats its children next to an anchor button. It renders into
 * document.body with fixed positioning, so the scrolling message list
 * cannot clip it, and it is clamped to stay inside the window.
 */
export function ReactionPopover({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  // Opening upward pins the bottom edge, so content that grows (the full
  // picker replacing the quick reactions) extends upward without waiting
  // for a re-measure.
  const [position, setPosition] = useState<
    { left: number } & ({ bottom: number; top?: never } | { top: number; bottom?: never })
  >();

  // Re-measure whenever the popover's size changes, e.g. when the full
  // emoji picker replaces the quick reactions.
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const { width, height } = popover.getBoundingClientRect();

      // Line up with the button's left edge (so growing wider does not move
      // it), then keep it inside the window.
      const left = Math.max(EDGE, Math.min(a.left - EDGE, window.innerWidth - width - EDGE));

      // Prefer above the button; go below when there is no room above.
      if (a.top - GAP - height >= EDGE) {
        setPosition({ left, bottom: window.innerHeight - a.top + GAP });
      } else {
        const top = Math.min(a.bottom + GAP, window.innerHeight - height - EDGE);
        setPosition({ left, top: Math.max(EDGE, top) });
      }
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(popover);
    return () => observer.disconnect();
  }, [anchorRef]);

  // Close on a click outside, Escape, scrolling the list, or resizing.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return; // the picker's own list
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: position ? position.top : 0,
        bottom: position?.bottom,
        left: position?.left ?? 0,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        visibility: position ? "visible" : "hidden",
      }}
      // No transition classes here: with transition-property defaulting to
      // `all`, a duration would animate top/left in from the corner.
      className="glass-panel rounded-3xl p-2.5 flex gap-1 z-[100]"
    >
      {children}
    </div>,
    document.body
  );
}
