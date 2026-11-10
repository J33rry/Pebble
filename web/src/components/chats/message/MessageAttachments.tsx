"use client";

import clsx from "clsx";
import { Download, Eye, FileIcon } from "lucide-react";
import type { Message } from "@/lib/api/messages";
import { VoiceNote } from "../VoiceNote";

export function MessageAttachments({
  msg,
  isMe,
  onOpenMedia,
}: {
  msg: Message;
  isMe: boolean;
  onOpenMedia: (url: string, type: "image" | "video") => void;
}) {
  return (
    <>
      {/* Image Media Attachment */}
      {msg.type === "image" && msg.media && (
        <div
          className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-2xl cursor-pointer relative group/img shadow-sm"
          onClick={() => onOpenMedia(msg.media!.url, "image")}
        >
          <img
            src={msg.media.url}
            alt="Attachment"
            className="max-w-xs max-h-72 object-cover rounded-2xl transition-transform duration-500 group-hover/img:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white backdrop-blur-[2px]">
            <Eye className="w-8 h-8 drop-shadow-md" />
          </div>
        </div>
      )}

      {/* Video Media Attachment */}
      {msg.type === "video" && msg.media && (
        <div
          className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-2xl cursor-pointer relative group/vid shadow-sm"
          onClick={() => onOpenMedia(msg.media!.url, "video")}
        >
          <video src={msg.media.url} className="max-w-xs max-h-64 rounded-2xl" />
          <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Audio Media Attachment */}
      {msg.type === "audio" && msg.media && <VoiceNote src={msg.media.url} seed={msg.id} isMe={isMe} />}

      {/* Document/File Media Attachment */}
      {msg.type === "file" && msg.media && (
        <a
          href={msg.media.url}
          target="_blank"
          rel="noreferrer"
          className={clsx(
            "flex items-center gap-3 mb-2 p-3 rounded-2xl transition-colors shadow-sm",
            isMe ? "bg-white/15 hover:bg-white/25 text-accent-fg" : "bg-surface hover:bg-surface-3 text-fg",
          )}
        >
          <div
            className={clsx(
              "p-2.5 rounded-xl shrink-0",
              isMe ? "bg-white/20 text-accent-fg" : "bg-accent-muted text-accent",
            )}
          >
            <FileIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate max-w-[180px]">{msg.media.filename}</p>
            <p className="text-[11px] opacity-70 font-medium mt-0.5">Download file</p>
          </div>
          <Download className="w-4 h-4 shrink-0 opacity-70" />
        </a>
      )}
    </>
  );
}
