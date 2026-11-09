"use client";

import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/hooks/useCall";
import { Avatar } from "@/components/ui/Avatar";
import { ChatWater, ChatWaterHandle } from "@/components/chats/ChatWater";
import clsx from "clsx";

// One ring out from beneath the card per beat, like the call ringing through the water.
const RING_MS = 1600;

export function IncomingCallModal() {
  const { incomingCall, callState } = useCallStore();

  if (callState !== "ringing-incoming" || !incomingCall) return null;

  return <IncomingCallCard />;
}

function IncomingCallCard() {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  const waterRef = useRef<ChatWaterHandle | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ring = () => {
      const card = cardRef.current?.getBoundingClientRect();
      if (!card) return;
      // A point, so the rings stay round: `surface` spreads wide rects along their width.
      waterRef.current?.surface(new DOMRect(card.left + card.width / 2, card.top + card.height / 2, 1, 1), 2);
    };
    ring();
    const timer = window.setInterval(ring, RING_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === "video";

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4">
      {/* Backdrop, under the water so it only shows where WebGL is missing */}
      <div className="absolute inset-0 -z-20 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300" />
      <ChatWater handleRef={waterRef} />

      {/* Modal Card - solid, so the rings pass beneath it */}
      <div ref={cardRef} className="relative z-10 flex flex-col items-center gap-10 px-10 py-12 rounded-[2.5rem] bg-surface shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-full animate-in zoom-in-95 duration-500 border border-border">
        <Avatar
          src={incomingCall.initiator.avatarUrl}
          name={incomingCall.initiator.displayName || incomingCall.initiator.username}
          size="xl"
        />

        {/* Caller Info */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-fg tracking-tight font-display">
            {incomingCall.initiator.displayName || incomingCall.initiator.username}
          </h2>
          <p className="text-sm text-accent flex items-center justify-center gap-2 font-mono tracking-widest uppercase font-bold">
            {isVideo ? (
              <Video className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            Incoming {isVideo ? "video" : "audio"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-10 pt-4">
          <button
            onClick={rejectCall}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-surface-3/50 group-hover:bg-danger flex items-center justify-center transition-all duration-300 border border-border group-hover:border-danger group-hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] group-hover:scale-110">
              <PhoneOff className={clsx("w-7 h-7 transition-colors", "text-muted group-hover:text-white")} />
            </div>
            <span className="text-xs text-muted font-bold tracking-widest uppercase transition-colors group-hover:text-danger">Decline</span>
          </button>

          <button
            onClick={acceptCall}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_var(--border-glow)] group-hover:shadow-[0_0_40px_var(--border-glow)] group-hover:scale-110">
              <Phone className="w-7 h-7 text-accent-fg" />
            </div>
            <span className="text-xs text-accent font-bold tracking-widest uppercase transition-colors">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
