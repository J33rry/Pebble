"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MessageCircle, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useOpenDm } from "@/hooks/useOpenDm";
import { usePresence } from "@/hooks/usePresence";
import { contactsApi, type Contact } from "@/lib/api/contacts";
import { usersApi, type User } from "@/lib/api/users";
import { softBtn } from "./buttonStyles";

/** Username search with a connect / message action on each result. */
export function ContactSearch({ contacts }: { contacts?: Contact[] }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();
  const { toast } = useToast();
  const { openDm } = useOpenDm();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        usersApi
          .search(searchQuery.replace(/^@/, ""))
          .then((results) => setSearchResults(results.users || []))
          .catch(console.error)
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast("Contact request sent!", "success");
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to send contact request", "error");
    },
  });

  const relationFor = (userId: string) => {
    if (userId === currentUser?.id) return "self";
    const existing = contacts?.find((c) => c.contactId === userId || c.userId === userId);
    return existing?.status === "accepted"
      ? "connected"
      : existing?.status === "pending"
        ? "pending"
        : "none";
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-5 py-3.5 text-muted focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
        <Search className="h-6 w-6 shrink-0" strokeWidth={1.8} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username (e.g., @jasminepark)"
          className="w-full bg-transparent text-[17px] text-fg placeholder:text-muted focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-1 rounded-lg hover:text-fg"
            title="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </label>

      {searchQuery.trim() && (
        <div className="rounded-3xl border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
          {isSearching ? (
            <div className="space-y-3 p-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-5 text-center text-sm text-muted">
              No users found matching &quot;{searchQuery}&quot;
            </p>
          ) : (
            <ul>
              {searchResults.map((user) => {
                const relation = relationFor(user.id);
                return (
                  <li
                    key={user.id}
                    className="flex items-center gap-3.5 rounded-2xl p-3 hover:bg-surface-2/60"
                  >
                    <Avatar
                      src={user.avatarUrl}
                      name={user.displayName}
                      size="lg"
                      showPresence
                      isOnline={isOnline(user.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg truncate">{user.displayName}</p>
                      <p className="text-sm text-muted truncate">@{user.username}</p>
                    </div>
                    {relation === "self" ? (
                      <span className="text-sm text-muted">You</span>
                    ) : relation === "connected" ? (
                      <button onClick={() => openDm(user.id)} className={softBtn}>
                        <MessageCircle className="h-4 w-4" /> Message
                      </button>
                    ) : relation === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                        <Clock className="h-4 w-4" /> Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={sendRequestMutation.isPending}
                        className={softBtn}
                      >
                        <UserPlus className="h-4 w-4" /> Connect
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
