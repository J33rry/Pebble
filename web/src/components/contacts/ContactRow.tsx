"use client";

import clsx from "clsx";
import { MessageCircle, MoreHorizontal, Phone, Star, UserMinus, Video } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Contact } from "@/lib/api/contacts";
import { softBtn } from "./buttonStyles";

export function ContactRow({
  contact,
  online,
  lastSeen,
  favorite,
  onToggleFavorite,
  menuOpen,
  onMenu,
  onMessage,
  onCall,
  onRemove,
}: {
  contact: Contact;
  online: boolean;
  lastSeen: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onMessage: () => void;
  onCall: (type: "audio" | "video") => void;
  onRemove: () => void;
}) {
  const target = contact.contactUser!;
  const menuItem =
    "w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-surface-2";

  return (
    <li className="flex items-center gap-3 sm:gap-4 py-2.5">
      <button
        onClick={onToggleFavorite}
        className={clsx(
          "p-1.5 rounded-lg transition-colors",
          favorite ? "text-accent" : "text-muted hover:text-fg",
        )}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorite}
      >
        <Star className={clsx("h-5 w-5", favorite && "fill-current")} />
      </button>

      <Avatar
        src={target.avatarUrl}
        name={target.displayName}
        size="xl"
        className="[&>div]:!w-14 [&>div]:!h-14"
      />

      <div className="min-w-0 flex-1 sm:flex-none sm:w-56">
        <p className="flex items-center gap-2 text-[17px] font-semibold text-fg">
          <span
            className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", online ? "bg-success" : "bg-faint/60")}
          />
          <span className="truncate">{target.displayName}</span>
        </p>
        <p className="pl-[18px] text-[15px] text-muted truncate">@{target.username}</p>
      </div>

      <div className="hidden lg:block min-w-0 flex-1">
        {target.bio && <p className="text-[15px] text-fg truncate">{target.bio}</p>}
        <p className="text-sm text-muted truncate">{online ? "Online" : lastSeen}</p>
      </div>

      <button onClick={onMessage} className={clsx(softBtn, "hidden sm:inline-flex")}>
        <MessageCircle className="h-4 w-4" /> Message
      </button>

      <div className="relative">
        <button
          onClick={() => onMenu(!menuOpen)}
          className="p-2 rounded-xl text-fg hover:bg-surface-2 transition-colors"
          title="More"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => onMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-30 w-48 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm text-muted">
              <button
                onClick={() => {
                  onMenu(false);
                  onMessage();
                }}
                className={clsx(menuItem, "sm:hidden hover:text-fg")}
              >
                <MessageCircle className="h-4 w-4" /> Message
              </button>
              <button
                onClick={() => {
                  onMenu(false);
                  onCall("audio");
                }}
                className={clsx(menuItem, "hover:text-fg")}
              >
                <Phone className="h-4 w-4" /> Voice call
              </button>
              <button
                onClick={() => {
                  onMenu(false);
                  onCall("video");
                }}
                className={clsx(menuItem, "hover:text-fg")}
              >
                <Video className="h-4 w-4" /> Video call
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => {
                  onMenu(false);
                  onRemove();
                }}
                className={clsx(menuItem, "hover:text-danger")}
              >
                <UserMinus className="h-4 w-4" /> Remove contact
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
