"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { messagesApi, type Message } from "@/lib/api/messages";
import { renderMessageText } from "@/lib/utils/mentions";
import { MessageActions } from "./MessageActions";
import { MessageAttachments } from "./MessageAttachments";
import { MessageFooter } from "./MessageFooter";
import { RepliedMessagePreview } from "./RepliedMessagePreview";

export function MessageBubble({
  msg,
  isMe,
  showAvatar,
  chatId,
  prevMsgMap,
  onOpenMedia,
  isGroup,
}: {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  chatId: string;
  prevMsgMap: Map<string, Message>;
  onOpenMedia: (url: string, type: "image" | "video") => void;
  isGroup: boolean;
}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const refreshMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
  };

  const addReaction = (emoji: string) => {
    messagesApi.addReaction(chatId, msg.id, emoji).then(refreshMessages).catch(console.error);
  };

  const toggleReaction = (emoji: string) => {
    const hasReacted = msg.reactions?.some((r) => r.userId === currentUser?.id && r.reaction === emoji);
    if (hasReacted) {
      messagesApi.removeReaction(chatId, msg.id, emoji).then(refreshMessages).catch(console.error);
    } else {
      addReaction(emoji);
    }
  };

  const repliedTo = msg.replyToMessageId ? prevMsgMap.get(msg.replyToMessageId) : null;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 sm:gap-4 max-w-[90%] sm:max-w-[80%] min-w-0 group/row relative animate-in-slide",
        isMe ? "self-end flex-row-reverse" : "self-start",
      )}
      data-msg-id={msg.id}
    >
      <div className="hidden sm:block w-14 shrink-0">
        {showAvatar && (
          <Avatar
            src={msg.sender?.avatarUrl}
            name={msg.sender?.displayName}
            size="xl"
            className="[&>div]:!w-14 [&>div]:!h-14"
          />
        )}
      </div>

      <div className={clsx("flex flex-col relative min-w-0 max-w-full", isMe ? "items-end" : "items-start")}>
        <div
          data-bubble
          className={clsx(
            "px-4 py-2.5 rounded-[18px] group relative text-[16px] min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
            msg.isDeleted
              ? "bg-surface-2 italic text-muted"
              : isMe
                ? "bg-accent text-accent-fg shadow-[0_10px_24px_-14px_var(--accent)]"
                : "bg-surface-2 text-fg",
          )}
        >
          {!isMe && showAvatar && isGroup && !msg.isDeleted && (
            <p className="text-[15px] font-semibold text-accent leading-tight mb-0.5">
              {msg.sender?.displayName}
            </p>
          )}
          {msg.isDeleted ? (
            "This message was deleted."
          ) : (
            <>
              {repliedTo && <RepliedMessagePreview repliedTo={repliedTo} isMe={isMe} />}
              <MessageAttachments msg={msg} isMe={isMe} onOpenMedia={onOpenMedia} />
              {/* Text content */}
              {msg.content && (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-snug">
                  {renderMessageText(msg.content, msg.mentions, currentUser?.id, isMe)}
                </p>
              )}

              {msg.isEdited && <span className="text-xs opacity-70 inline-block mt-0.5">edited</span>}

              <MessageActions msg={msg} isMe={isMe} chatId={chatId} onReact={addReaction} />
            </>
          )}

          {!msg.isDeleted && (
            <MessageFooter msg={msg} isMe={isMe} isGroup={isGroup} onToggleReaction={toggleReaction} />
          )}
        </div>
      </div>
    </div>
  );
}
