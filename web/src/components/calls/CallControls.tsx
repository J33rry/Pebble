"use client";

import clsx from "clsx";
import { LogOut, Mic, MicOff, MoreVertical, PhoneOff, Video, VideoOff } from "lucide-react";

export function CallControls({
  isMuted,
  isVideoOn,
  showLeaveButton,
  mainButtonLabel,
  onToggleMute,
  onToggleVideo,
  onLeave,
  onMainButton,
}: {
  isMuted: boolean;
  isVideoOn: boolean;
  showLeaveButton: boolean;
  mainButtonLabel: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
  onMainButton: () => void;
}) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
      <div className="glass-pill px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 md:gap-6 shadow-2xl border border-border">
        <button
          onClick={onToggleMute}
          className={clsx(
            "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300",
            isMuted
              ? "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
              : "bg-surface-3/50 text-fg hover:bg-surface-3 hover:text-fg",
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={clsx(
            "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300",
            !isVideoOn
              ? "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
              : "bg-surface-3/50 text-fg hover:bg-surface-3 hover:text-fg",
          )}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {!isVideoOn ? (
            <VideoOff className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <Video className="w-5 h-5 md:w-6 md:h-6" />
          )}
        </button>

        {showLeaveButton && (
          <button
            onClick={onLeave}
            className="h-12 md:h-14 px-4 md:px-5 rounded-full flex items-center justify-center gap-2 bg-surface-3/50 text-fg hover:bg-surface-3 text-sm md:text-[15px] font-medium whitespace-nowrap transition-all duration-300"
            title="Leave call. It continues for everyone else."
          >
            <LogOut className="w-5 h-5" />
            Leave
          </button>
        )}

        <button
          onClick={onMainButton}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-danger hover:bg-danger-fg hover:text-danger text-white flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 mx-2"
          title={mainButtonLabel}
          aria-label={mainButtonLabel}
        >
          <PhoneOff className="w-7 h-7 md:w-8 md:h-8" />
        </button>

        <button
          className={clsx(
            "w-12 h-12 md:w-14 md:h-14 rounded-full items-center justify-center bg-surface-3/50 text-fg hover:bg-surface-3 transition-all duration-300",
            showLeaveButton ? "hidden xl:flex" : "flex",
          )}
          title="More Options"
        >
          <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>
    </div>
  );
}
