"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import clsx from "clsx";
import { Check, Loader2, Mic, Paperclip, Send, Smile, Square } from "lucide-react";
import { useComposerAttachment } from "@/hooks/useComposerAttachment";
import { useMentionAutocomplete } from "@/hooks/useMentionAutocomplete";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useTyping } from "@/hooks/useTyping";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { mediaApi } from "@/lib/api/media";
import { messagesApi } from "@/lib/api/messages";
import { formatDuration } from "@/lib/utils/time";
import { AttachmentPreview } from "./composer/AttachmentPreview";
import { EditBanner, ReplyBanner } from "./composer/ComposerBanners";
import { MentionPopover } from "./composer/MentionPopover";

interface MessageComposerProps {
  chatId: string;
}

export function MessageComposer({ chatId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const queryClient = useQueryClient();
  const { sendTypingStart } = useTyping(chatId);
  const { editingMessage, replyingToMessage, clearActions } = useMessageActions();
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    selectedFile,
    setSelectedFile,
    previewUrl,
    isDragging,
    fileInputRef,
    resetFile,
    handleFileSelect,
    dragHandlers,
  } = useComposerAttachment();
  const { recordingSeconds, isRecording, toggleRecording } = useVoiceRecorder(setSelectedFile);
  const mentions = useMentionAutocomplete({ chatId, content, setContent, textareaRef });

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
      setSelectedFile(null);
    } else {
      setContent("");
    }
  }, [editingMessage, setSelectedFile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearFile = () => {
    if (!isUploading) resetFile();
  };

  // Kept across a failed send: if the request actually reached the server and
  // only the response was lost, resending the same message reuses this id and
  // the server won't create a second copy.
  const sendAttemptRef = useRef<{ id: string; fingerprint: string } | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      text,
      mediaId,
      type,
    }: {
      text: string;
      mediaId?: string;
      type: "text" | "image" | "video" | "audio" | "file";
    }) => {
      const fingerprint = `${text}|${mediaId ?? ""}`;
      if (sendAttemptRef.current?.fingerprint !== fingerprint) {
        sendAttemptRef.current = { id: crypto.randomUUID(), fingerprint };
      }

      return messagesApi.sendMessage(chatId, {
        type,
        content: text || undefined,
        mediaId,
        replyToMessageId: replyingToMessage?.id,
        clientMessageId: sendAttemptRef.current.id,
      });
    },
    onSuccess: () => {
      sendAttemptRef.current = null;
      setContent("");
      resetFile();
      setIsUploading(false);
      setUploadProgress(0);
      setShowEmojiPicker(false);
      clearActions();
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err) => {
      console.error("Send failed", err);
      alert("Failed to send message");
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!editingMessage) throw new Error("No message to edit");
      return messagesApi.editMessage(chatId, editingMessage.id, text);
    },
    onSuccess: () => {
      setContent("");
      clearActions();
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err) => {
      console.error("Edit failed", err);
      alert("Failed to edit message");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendMessageMutation.isPending || editMessageMutation.isPending || isUploading) return;

    if (editingMessage) {
      if (!content.trim()) return;
      editMessageMutation.mutate({ text: content.trim() });
      return;
    }

    if (!content.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const media = await mediaApi.upload(selectedFile, setUploadProgress);

        let type: "image" | "video" | "audio" | "file" = "file";
        if (selectedFile.type.startsWith("image/")) type = "image";
        else if (selectedFile.type.startsWith("video/")) type = "video";
        else if (selectedFile.type.startsWith("audio/")) type = "audio";

        sendMessageMutation.mutate({ text: content.trim(), mediaId: media.id, type });
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload file");
        setIsUploading(false);
      }
    } else {
      sendMessageMutation.mutate({ text: content.trim(), type: "text" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // The mention popover must claim these keys BEFORE the Enter-to-send
    // branch below, or picking a suggestion would send a half-typed mention.
    if (mentions.handleMentionKey(e)) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    sendTypingStart();
    mentions.detectMention(value, e.target.selectionStart ?? value.length);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div
      className="px-4 md:px-6 pb-4 pt-2 shrink-0 flex flex-col relative z-20"
      ref={containerRef}
      {...dragHandlers}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-2 z-40 bg-surface-2 border-2 border-dashed border-accent rounded-2xl flex flex-col items-center justify-center text-accent pointer-events-none">
          <Paperclip className="w-10 h-10 mb-3 animate-bounce" />
          <p className="text-sm font-bold tracking-wide">Drop file to attach</p>
        </div>
      )}

      {/* Emoji Picker Floating Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-6 z-50 shadow-[var(--shadow-lg)] rounded-3xl overflow-hidden border border-border">
          <EmojiPicker
            theme={Theme.AUTO}
            onEmojiClick={handleEmojiSelect}
            lazyLoadEmojis={true}
            searchDisabled={false}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={clsx(
          "flex flex-col rounded-2xl bg-surface-2 transition-shadow w-full relative overflow-visible",
          editingMessage || replyingToMessage
            ? "ring-2 ring-accent/50"
            : "focus-within:ring-2 focus-within:ring-accent/40",
        )}
      >
        {replyingToMessage && <ReplyBanner message={replyingToMessage} onCancel={clearActions} />}

        {editingMessage && (
          <EditBanner
            onCancel={() => {
              clearActions();
              setContent("");
            }}
          />
        )}

        {selectedFile && !editingMessage && (
          <AttachmentPreview
            file={selectedFile}
            previewUrl={previewUrl}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onRemove={clearFile}
          />
        )}

        <div className="flex items-end gap-1 py-1.5 px-2">
          {!editingMessage && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 text-accent hover:bg-surface-3 transition-colors rounded-xl disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-6 h-6" strokeWidth={1.8} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-muted hover:text-accent transition-colors rounded-xl hover:bg-surface-3"
            title="Emoji"
          >
            <Smile className="w-6 h-6" strokeWidth={1.8} />
          </button>

          {mentions.candidates.length > 0 && (
            <MentionPopover
              candidates={mentions.candidates}
              activeIndex={mentions.activeIndex}
              onHover={mentions.setActiveIndex}
              onSelect={mentions.applyMention}
            />
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage ? "Edit message..." : selectedFile ? "Add a caption..." : "Your message"
            }
            className="flex-1 bg-transparent border-0 text-fg placeholder:text-muted resize-none max-h-32 min-h-[44px] focus:outline-none py-2.5 px-2 text-[16px] leading-relaxed"
            rows={1}
            disabled={isUploading || editMessageMutation.isPending}
            autoFocus={!!editingMessage || !!replyingToMessage}
          />

          {isRecording ? (
            <span className="self-center flex items-center gap-2 px-2 text-sm font-medium text-danger tabular-nums">
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
              {formatDuration(recordingSeconds ?? 0)}
            </span>
          ) : null}

          {!editingMessage && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isUploading || (!!selectedFile && !isRecording)}
              className={clsx(
                "p-2.5 rounded-xl transition-colors disabled:opacity-40",
                isRecording ? "text-danger hover:bg-surface-3" : "text-accent hover:bg-surface-3",
              )}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? (
                <Square className="w-6 h-6 fill-current" />
              ) : (
                <Mic className="w-6 h-6" strokeWidth={1.8} />
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={
              isRecording ||
              (editingMessage ? !content.trim() : !content.trim() && !selectedFile) ||
              sendMessageMutation.isPending ||
              editMessageMutation.isPending ||
              isUploading
            }
            className="p-2.5 rounded-xl text-accent hover:bg-surface-3 transition-colors disabled:text-faint disabled:hover:bg-transparent"
            title="Send"
          >
            {sendMessageMutation.isPending || editMessageMutation.isPending || isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-6 h-6" />
            ) : (
              <Send className="w-6 h-6" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
