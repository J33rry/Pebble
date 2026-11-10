"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Edit2, Reply, Smile, Trash2 } from "lucide-react";
import { messagesApi, type Message } from "@/lib/api/messages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { ReactionPopover } from "./ReactionPopover";

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

  const reactButtonRef = useRef<HTMLButtonElement>(null);

  const closeReactions = useCallback(() => {
    setShowReactionsMenu(false);
    setShowEmojiPicker(false);
  }, []);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    closeReactions();
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
        "absolute top-2 group-hover/row:flex items-center gap-1 glass-pill p-1.5 z-20 shadow-xl",
        // Stay visible while the picker is open: it is positioned from the
        // React button, and the pointer leaves the row to reach it.
        showReactionsMenu || showEmojiPicker ? "flex" : "hidden",
        isMe ? "right-full translate-x-3" : "left-full -translate-x-3",
      )}
    >
      <div className="relative">
        <button
          ref={reactButtonRef}
          onClick={() => (showReactionsMenu || showEmojiPicker ? closeReactions() : setShowReactionsMenu(true))}
          className="p-2 hover:text-accent text-muted rounded-full hover:bg-surface-3/50 transition-colors"
          title="React"
        >
          <Smile className="w-4 h-4" />
        </button>

        {(showReactionsMenu || showEmojiPicker) && (
          <ReactionPopover anchorRef={reactButtonRef} onClose={closeReactions}>
            {showEmojiPicker ? (
              <div onClick={(e) => e.stopPropagation()}>
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
          </ReactionPopover>
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
