"use client";

import { useRef, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageCircle,
  Users,
  Phone,
  Contact,
  SlidersHorizontal,
  LogOut,
  Loader2,
  Folder,
  FolderPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { useCallEvents } from "@/hooks/useCallEvents";
import { useUnread } from "@/hooks/useUnread";
import { useChatFolder } from "@/hooks/useChatFolder";
import { usePageWave, type WaveTo } from "@/hooks/usePageWave";
import { foldersApi } from "@/lib/api/folders";
import { IncomingCallModal } from "@/components/calls/IncomingCallModal";
import { FolderManagerModal } from "@/components/chats/FolderManagerModal";
import { Avatar } from "@/components/ui/Avatar";
import { PebbleMark } from "@/components/ui/PebbleMark";

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={clsx(
        "absolute min-w-[22px] h-[22px] px-1.5 rounded-full bg-danger text-danger-fg text-[11px] font-semibold flex items-center justify-center ring-2 ring-rail",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** A nav link whose page change ripples out from beside the link. */
function WaveLink({ href, waveTo, ...props }: ComponentProps<typeof Link> & { href: string; waveTo: WaveTo }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <Link
      {...props}
      href={href}
      ref={ref}
      onNavigate={(e) => {
        if (!ref.current) return;
        e.preventDefault();
        waveTo(href, ref.current);
      }}
    />
  );
}

function RailItem({
  label,
  icon: Icon,
  iconNode,
  active,
  count = 0,
  href,
  waveTo,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  /** Custom artwork (e.g. the user's avatar) in place of `icon`. */
  iconNode?: React.ReactNode;
  active?: boolean;
  count?: number;
  href?: string;
  waveTo?: WaveTo;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const className = clsx(
    "relative flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[13px] font-medium transition-colors",
    active ? "bg-white/12 text-rail-fg" : "text-rail-fg/70 hover:bg-white/6 hover:text-rail-fg"
  );
  const content = (
    <>
      <span className="relative">
        {iconNode ?? (Icon && <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />)}
        <CountBadge count={count} className="-top-2.5 left-3.5" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </>
  );
  return href && waveTo ? (
    <WaveLink href={href} waveTo={waveTo} onClick={onClick} className={className}>
      {content}
    </WaveLink>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);
  const { folderId, setFolderId } = useChatFolder();
  const { waveTo, panelRef, crestRef } = usePageWave();

  // Initialize websocket connection for authenticated user
  useSocket();

  // Wire WebSocket call events → Zustand call store
  useCallEvents();

  // Derived from the chat list the sidebar already loads — no extra request.
  const { totalUnread } = useUnread();

  const { data: foldersData } = useQuery({
    queryKey: ["folders"],
    queryFn: () => foldersApi.getFolders(),
  });
  const folders = foldersData?.folders || [];

  const onChats = pathname === "/" || pathname.startsWith("/chats");

  const openFolder = (id: string | null, from: HTMLElement) => {
    setFolderId(id);
    if (!onChats) waveTo("/", from);
  };

  const mobileNav = [
    { name: "Chats", href: "/", icon: MessageCircle, active: onChats },
    { name: "Calls", href: "/calls", icon: Phone, active: pathname.startsWith("/calls") },
    { name: "Contacts", href: "/contacts", icon: Contact, active: pathname.startsWith("/contacts") },
    { name: "Settings", href: "/settings", icon: SlidersHorizontal, active: pathname.startsWith("/settings") },
  ];

  return (
    <div className="flex h-full h-screen h-[100dvh] w-full bg-surface md:bg-rail overflow-hidden text-fg relative">
      {/* Desktop navigation rail */}
      <nav className="hidden md:flex w-[108px] shrink-0 flex-col items-center py-6 select-none h-full relative z-30">
        <WaveLink href="/" waveTo={waveTo} onClick={() => setFolderId(null)} className="flex flex-col items-center gap-1 mb-6" title="Pebble">
          <PebbleMark className="h-9 w-12" />
          <span className="text-[19px] font-semibold tracking-tight text-rail-fg">Pebble</span>
        </WaveLink>

        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1.5 [scrollbar-width:none]">
          <RailItem
            label={folders.length ? "All chats" : "Chats"}
            icon={MessageCircle}
            active={onChats && folderId === null}
            count={totalUnread}
            onClick={(e) => openFolder(null, e.currentTarget)}
          />
          {folders.map((f) => (
            <RailItem
              key={f.id}
              label={f.name}
              icon={Folder}
              active={onChats && folderId === f.id}
              count={f.unreadCount}
              onClick={(e) => openFolder(f.id, e.currentTarget)}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsFoldersOpen(true)}
            className="flex h-8 w-[84px] shrink-0 items-center justify-center rounded-xl text-rail-fg/45 hover:bg-white/6 hover:text-rail-fg transition-colors"
            title="Manage folders"
          >
            <FolderPlus className="h-4 w-4" />
          </button>

          <div className="my-2 h-px w-10 shrink-0 bg-rail-fg/25" />

          <RailItem label="Calls" icon={Phone} href="/calls" waveTo={waveTo} active={pathname.startsWith("/calls")} />
          <RailItem label="Contacts" icon={Users} href="/contacts" waveTo={waveTo} active={pathname.startsWith("/contacts")} />
          {/* Profile and settings share one page, so one entry: your avatar. */}
          <RailItem
            label="Settings"
            href="/settings"
            waveTo={waveTo}
            active={pathname.startsWith("/settings")}
            iconNode={
              <span
                className={clsx(
                  "block rounded-[30%] ring-2 transition-shadow",
                  pathname.startsWith("/settings") ? "ring-rail-fg" : "ring-transparent"
                )}
              >
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.displayName || user?.username}
                  size="xs"
                />
              </span>
            }
          />
        </div>

        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="mt-4 flex w-[84px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-medium text-rail-fg/70 hover:bg-white/6 hover:text-rail-fg transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" strokeWidth={1.8} />}
          Log out
        </button>

      </nav>

      <FolderManagerModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />

      {/* Main panel */}
      <main className="flex-1 flex h-full min-w-0 overflow-hidden relative md:py-3 md:pr-3">
        <div ref={panelRef} data-page-wave-panel className="flex-1 flex bg-surface md:rounded-[28px] overflow-hidden relative pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-center pointer-events-none">
        <div className="flex items-center justify-around w-full max-w-sm px-2 py-1.5 rounded-3xl bg-rail shadow-[var(--shadow-lg)] pointer-events-auto">
          {mobileNav.map((item) => (
            <WaveLink
              key={item.name}
              href={item.href}
              waveTo={waveTo}
              className={clsx(
                "relative flex flex-col items-center justify-center w-16 py-1.5 rounded-2xl transition-colors",
                item.active ? "text-rail-fg bg-white/12" : "text-rail-fg/60 hover:text-rail-fg"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.href === "/" && <CountBadge count={totalUnread} className="-top-1 right-1.5 !h-[18px] !min-w-[18px] !text-[10px]" />}
              <span className="text-[10px] font-medium">{item.name}</span>
            </WaveLink>
          ))}
        </div>
      </div>

      {/* The water of the page-change wave */}
      <canvas ref={crestRef} data-page-wave-crest aria-hidden="true" className="pointer-events-none fixed z-[90]" />

      {/* Incoming call overlay — rendered above everything */}
      <IncomingCallModal />
    </div>
  );
}
