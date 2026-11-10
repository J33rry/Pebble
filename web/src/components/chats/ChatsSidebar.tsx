"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Search, SquarePen } from "lucide-react";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useChatFolder } from "@/hooks/useChatFolder";
import { useChatListUpdates } from "@/hooks/useChatListUpdates";
import { chatsApi, type ChatPreferences } from "@/lib/api/chats";
import { chatTitle } from "@/lib/utils/chatDisplay";
import { ChatFoldersRail } from "./ChatFoldersRail";
import { FolderManagerModal } from "./FolderManagerModal";
import { NewChatModal } from "./NewChatModal";
import { ChatRow } from "./sidebar/ChatRow";
import { ChatViewMenu, VIEWS, type ChatView } from "./sidebar/ChatViewMenu";

export function ChatsSidebar() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [view, setView] = useState<ChatView>("recent");
  const [search, setSearch] = useState("");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const { folderId, setFolderId } = useChatFolder();
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);

  const showArchived = view === "archived";

  const { data, isLoading } = useQuery({
    queryKey: showArchived ? ["chats", { archived: true }] : ["chats"],
    queryFn: () => chatsApi.getChats(showArchived ? { archived: true } : undefined),
  });

  const prefsMutation = useMutation({
    mutationFn: ({ chatId, prefs }: { chatId: string; prefs: ChatPreferences }) =>
      chatsApi.updateChatPreferences(chatId, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const setPref = (chatId: string, prefs: ChatPreferences) => {
    setMenuChatId(null);
    prefsMutation.mutate({ chatId, prefs });
  };

  useChatListUpdates(data);

  const chats = data?.chats || [];
  const query = search.trim().toLowerCase();

  // Filter chats by view, folder & search
  const filteredChats = chats.filter((chat) => {
    if (view === "dm" && chat.type !== "dm") return false;
    if (view === "group" && chat.type !== "group") return false;
    if (view === "unread" && !(chat.unreadCount || 0)) return false;
    // The archived view queries its own list, so no extra filtering here.
    if (!showArchived && folderId && !(chat.folderIds || []).includes(folderId)) {
      return false;
    }
    if (query) {
      const haystack =
        `${chatTitle(chat, currentUser?.id)} ${chat.latestMessage?.content || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const activeView = VIEWS.find((v) => v.value === view)!;

  return (
    <div className="flex flex-col h-full select-none">
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <FolderManagerModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />

      <div className="px-5 pt-5 shrink-0 space-y-5">
        <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-muted focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
          <Search className="h-5 w-5 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-[15px] text-fg placeholder:text-muted focus:outline-none"
          />
        </label>

        {/* Folder pills — on desktop the nav rail carries folders */}
        {!showArchived && (
          <div className="md:hidden">
            <ChatFoldersRail
              activeFolderId={folderId}
              onSelect={setFolderId}
              onManage={() => setIsFoldersOpen(true)}
              totalUnread={chats.reduce((s, c) => s + (c.unreadCount || 0), 0)}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-semibold text-fg tracking-tight">{activeView.title}</h2>
          <div className="flex items-center gap-1">
            <ChatViewMenu view={view} onChange={setView} />
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-accent hover:bg-surface-3 transition-colors"
              title="New conversation"
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {isLoading ? (
          <ChatListSkeleton />
        ) : (
          <ul className="space-y-0.5">
            {filteredChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                menuOpen={menuChatId === chat.id}
                onToggleMenu={() => setMenuChatId(menuChatId === chat.id ? null : chat.id)}
                onCloseMenu={() => setMenuChatId(null)}
                setPref={setPref}
              />
            ))}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center space-y-4 mt-10">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-accent">
                  <MessageSquarePlus className="w-7 h-7" />
                </div>
                <p className="text-sm text-muted">
                  {query
                    ? `No conversations match “${search.trim()}”.`
                    : showArchived
                      ? "No archived chats."
                      : "No chats here yet. Start a conversation!"}
                </p>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
