"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { Participant } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { CallParticipantTile } from "./CallParticipantTile";

export function CallStage({
  callType,
  elapsedLabel,
  isVideoOn,
  remoteParticipants,
  remoteVideoTracks,
  localVideoTracks,
}: {
  callType: "audio" | "video";
  elapsedLabel: string;
  isVideoOn: boolean;
  remoteParticipants: Participant[];
  remoteVideoTracks: TrackReferenceOrPlaceholder[];
  localVideoTracks: TrackReferenceOrPlaceholder[];
}) {
  return (
    <div className="flex-1 flex items-center justify-center relative p-4 md:p-12 overflow-hidden w-full h-full">
      {remoteVideoTracks.length > 0 ? (
        <div
          className={clsx(
            "grid gap-4 w-full h-full max-w-[1400px] mx-auto",
            remoteVideoTracks.length === 1
              ? "grid-cols-1"
              : remoteVideoTracks.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3",
          )}
        >
          {remoteVideoTracks.map((trackRef) => (
            <div
              key={trackRef.participant.sid}
              className="rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface-2 relative group"
            >
              <CallParticipantTile
                trackRef={trackRef}
                displayName={trackRef.participant.name || trackRef.participant.identity}
                isMuted={!trackRef.participant.isMicrophoneEnabled}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
          {remoteParticipants.length > 0 ? (
            <div className="flex -space-x-4">
              {remoteParticipants.map((p, i) => (
                <div
                  key={p.sid}
                  className="w-32 h-32 rounded-full glass-panel border-2 border-accent/40 flex items-center justify-center shadow-[0_0_40px_var(--border-glow)] relative z-10"
                  style={{ zIndex: 10 - i }}
                >
                  <span className="text-4xl font-bold text-accent font-display">
                    {(p.name || p.identity)?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
              <div className="w-32 h-32 rounded-full glass-panel border border-accent/30 flex items-center justify-center shadow-2xl relative z-10">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              </div>
            </div>
          )}

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-fg tracking-tight font-display">
              {remoteParticipants.length > 0
                ? callType === "audio"
                  ? "Audio Conversation"
                  : "Video Conversation"
                : "Connecting..."}
            </h2>
            <p className="text-sm text-accent font-mono tracking-widest uppercase font-bold">
              {remoteParticipants.length > 0 ? elapsedLabel : "Waiting for others"}
            </p>
          </div>
        </div>
      )}

      {/* Local video PIP */}
      {isVideoOn && localVideoTracks.length > 0 && (
        <div className="absolute bottom-32 right-6 md:bottom-8 md:right-8 w-40 md:w-56 aspect-[3/4] shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden border border-border z-20 transition-all duration-300 hover:scale-105">
          <CallParticipantTile trackRef={localVideoTracks[0]} displayName="You" isLocal />
        </div>
      )}
    </div>
  );
}
