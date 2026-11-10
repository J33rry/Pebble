"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Edit2, Reply, Smile, Trash2 } from "lucide-react";
import { messagesApi, type Message } from "@/lib/api/messages";
import { useMessageActions } from "@/hooks/useMessageActions";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** The bar that appears when hovering a message: react, reply, edit, delete. */
export function MessageActions({
  msg,
  isMe,
  chatId,
  onReact,
}: {
  msg: Message;
  isMe: boolean;
  chatId: string;
  onReact: (emoji: string) => void;
}) {
  const queryClient = useQueryClient();
  const { setEditingMessage, setReplyingToMessage } = useMessageActions();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setShowReactionsMenu(false);
    setShowEmojiPicker(false);
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    messagesApi.deleteMessage(chatId, msg.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    });
  };

  return (
    <div
      className={clsx(
        "absolute top-2 hidden group-hover/row:flex items-center gap-1 glass-pill p-1.5 z-20 shadow-xl",
        isMe ? "right-full translate-x-3" : "left-full -translate-x-3",
      )}
    >
      <div className="relative">
        <button
          onClick={() => setShowReactionsMenu(!showReactionsMenu)}
          className="p-2 hover:text-accent text-muted rounded-full hover:bg-surface-3/50 transition-colors"
          title="React"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Reaction Popover */}
        {(showReactionsMenu || showEmojiPicker) && (
          <div
            className={clsx(
              // Opens upward: the newest messages sit at the bottom of the
              // scrolling list, which would clip a picker opening downward.
              "absolute bottom-full mb-3 glass-panel rounded-3xl p-2.5 flex gap-1 z-50 animate-in fade-in zoom-in-95 duration-200",
              // Extend over the bubble rather than toward the list's edge.
              isMe ? "left-0" : "right-0",
            )}
          >
            {showEmojiPicker ? (
              <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
                <EmojiPicker
                  theme={Theme.AUTO}
                  onEmojiClick={(e) => handleReact(e.emoji)}
                  lazyLoadEmojis={true}
                  searchDisabled={false}
                />
              </div>
            ) : (
              <>
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-surface-3/50 rounded-full transition-all hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowEmojiPicker(true)}
                  className="w-10 h-10 flex items-center justify-center text-muted hover:bg-surface-3/50 hover:text-fg rounded-full transition-colors text-sm font-bold ml-1"
                >
                  +
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setReplyingToMessage(msg)}
        className="p-2 hover:text-blue-400 text-muted rounded-full hover:bg-surface-3/50 transition-colors"
        title="Reply"
      >
        <Reply className="w-4 h-4" />
      </button>

      {isMe && (
        <>
          <button
            onClick={() => setEditingMessage(msg)}
            className="p-2 hover:text-accent text-muted rounded-full hover:bg-surface-3/50 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:text-danger text-muted rounded-full hover:bg-surface-3/50 transition-colors"
            title="Delete"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
