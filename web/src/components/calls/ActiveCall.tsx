"use client";

import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { ShieldCheck } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useCallStore } from "@/hooks/useCall";
import { CallControls } from "./CallControls";
import { CallStage } from "./CallStage";

interface ActiveCallProps {
  token: string;
  serverUrl: string;
  callType: "audio" | "video";
  isGroup: boolean;
  canEndForEveryone: boolean;
}

export function ActiveCall({ token, serverUrl, callType, isGroup, canEndForEveryone }: ActiveCallProps) {
  const { endCall, leaveCall, setConnected } = useCallStore();

  const handleConnected = useCallback(() => {
    setConnected();
  }, [setConnected]);

  // In a group, losing your connection must not end the call for the others.
  const handleDisconnected = useCallback(() => {
    if (isGroup) leaveCall();
    else endCall();
  }, [isGroup, leaveCall, endCall]);

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col select-none animate-in fade-in duration-300">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio={true}
        video={callType === "video"}
        connect={true}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        className="flex flex-col h-full"
      >
        <RoomAudioRenderer />
        <CallContent callType={callType} isGroup={isGroup} canEndForEveryone={canEndForEveryone} />
      </LiveKitRoom>
    </div>
  );
}

function CallContent({
  callType,
  isGroup,
  canEndForEveryone,
}: {
  callType: "audio" | "video";
  isGroup: boolean;
  canEndForEveryone: boolean;
}) {
  const { endCall, leaveCall } = useCallStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const remoteTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [localParticipant, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  }, [localParticipant, isVideoOn]);

  // The store action runs first so it clears the active call before the
  // disconnect fires handleDisconnected.
  const exitCall = useCallback(
    async (exit: () => Promise<void>) => {
      const finished = exit();
      room.disconnect();
      await finished;
    },
    [room]
  );

  const showLeaveButton = isGroup && canEndForEveryone;
  const mainButtonLeaves = isGroup && !canEndForEveryone;
  const mainButtonLabel = mainButtonLeaves
    ? "Leave call"
    : isGroup
      ? "End call for everyone"
      : "End call";

  const remoteVideoTracks = remoteTracks.filter(
    (t) =>
      t.participant.sid !== localParticipant?.sid &&
      t.source === Track.Source.Camera
  );

  const localVideoTracks = remoteTracks.filter(
    (t) =>
      t.participant.sid === localParticipant?.sid &&
      t.source === Track.Source.Camera
  );

  const remoteParticipants = participants.filter(
    (p) => p.sid !== localParticipant?.sid
  );

  return (
    <>
      {/* Floating Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
        <div className="glass-pill px-4 py-2 flex items-center gap-2 pointer-events-auto">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-fg">
            Encrypted
          </span>
        </div>
        <div className="glass-pill px-4 py-2 pointer-events-auto">
          <span className="text-[13px] font-mono text-fg font-bold tracking-wider">
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      <CallStage
        callType={callType}
        elapsedLabel={formatTime(elapsed)}
        isVideoOn={isVideoOn}
        remoteParticipants={remoteParticipants}
        remoteVideoTracks={remoteVideoTracks}
        localVideoTracks={localVideoTracks}
      />


      <CallControls
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        showLeaveButton={showLeaveButton}
        mainButtonLabel={mainButtonLabel}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onLeave={() => exitCall(leaveCall)}
        onMainButton={() => exitCall(mainButtonLeaves ? leaveCall : endCall)}
      />
    </>
  );
}
