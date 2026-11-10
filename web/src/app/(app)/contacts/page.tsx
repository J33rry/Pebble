"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ContactRequests } from "@/components/contacts/ContactRequests";
import { ContactRow } from "@/components/contacts/ContactRow";
import { ContactSearch } from "@/components/contacts/ContactSearch";
import { contactsApi } from "@/lib/api/contacts";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFavorites } from "@/hooks/useFavorites";
import { useOpenDm } from "@/hooks/useOpenDm";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatLastSeen } from "@/lib/utils/presence";

type ContactFilter = "all" | "online" | "favorite";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  const { toast } = useToast();
  const favorites = useFavorites();
  const { openDm } = useOpenDm();

  const [filter, setFilter] = useState<ContactFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
  });
  const contacts = contactsData?.contacts;

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast("Contact removed", "info");
    },
  });

  const incomingRequests =
    contacts?.filter((c) => c.status === "pending" && c.contactId === currentUser?.id) || [];
  const outgoingRequests =
    contacts?.filter((c) => c.status === "pending" && c.userId === currentUser?.id) || [];
  const acceptedContacts = (contacts?.filter((c) => c.status === "accepted") || []).filter(
    (contact, index, self) => {
      if (!contact.contactUser) return false;
      return index === self.findIndex((c) => c.contactUser?.id === contact.contactUser?.id);
    }
  );

  const onlineContacts = acceptedContacts.filter((c) => isOnline(c.contactUser?.id));
  const favoriteContacts = acceptedContacts.filter((c) => favorites.ids.includes(c.contactUser!.id));
  const visibleContacts =
    filter === "online" ? onlineContacts : filter === "favorite" ? favoriteContacts : acceptedContacts;

  return (
    <div className="flex-1 overflow-y-auto bg-bg select-none">
      <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
        <div className="min-w-0 space-y-7">
          <header>
            <h1 className="text-[40px] font-semibold leading-tight text-fg tracking-tight">Find people</h1>
            <p className="text-lg text-muted">Connect with your team, collaborators, and others on Pebble.</p>
          </header>

          <ContactSearch contacts={contacts} />


          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-52 w-full rounded-3xl" />
              <Skeleton className="h-72 w-full rounded-3xl" />
            </div>
          ) : (
            <>
              {incomingRequests.length > 0 && <ContactRequests incomingRequests={incomingRequests} />}


              {/* Your contacts */}
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] font-semibold text-fg tracking-tight">Your contacts</h2>
                    <p className="text-muted">
                      {acceptedContacts.length} contact{acceptedContacts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div role="tablist" className="flex rounded-2xl bg-surface-2 p-1 text-[15px]">
                    {(
                      [
                        ["all", "All", acceptedContacts.length],
                        ["online", "Online", onlineContacts.length],
                        ["favorite", "Favorite", favoriteContacts.length],
                      ] as const
                    ).map(([value, label, count]) => (
                      <button
                        key={value}
                        role="tab"
                        aria-selected={filter === value}
                        onClick={() => setFilter(value)}
                        className={clsx(
                          "rounded-xl px-4 py-1.5 transition-colors",
                          filter === value ? "bg-surface text-accent shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"
                        )}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {visibleContacts.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-surface-2/50 p-8 text-center text-muted">
                    {filter === "all"
                      ? "You have no contacts yet. Search above to find people."
                      : filter === "online"
                        ? "None of your contacts are online right now."
                        : "Star a contact to add them to your favorites."}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {visibleContacts.map((contact) => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        online={isOnline(contact.contactUser?.id)}
                        lastSeen={formatLastSeen(getLastSeen(contact.contactUser!.id) || contact.contactUser!.lastSeenAt)}
                        favorite={favorites.ids.includes(contact.contactUser!.id)}
                        onToggleFavorite={() => favorites.toggle(contact.contactUser!.id)}
                        menuOpen={menuId === contact.id}
                        onMenu={(open) => setMenuId(open ? contact.id : null)}
                        onMessage={() => openDm(contact.contactUser!.id)}
                        onCall={(type) => openDm(contact.contactUser!.id, type)}
                        onRemove={() => deleteContactMutation.mutate(contact.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Sent requests */}
              {outgoingRequests.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-fg">Awaiting response</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {outgoingRequests.map((contact) => (
                      <li key={contact.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-2/60 py-1.5 pl-1.5 pr-2">
                        <Avatar src={contact.contactUser?.avatarUrl} name={contact.contactUser?.displayName} size="sm" />
                        <span className="text-sm font-medium text-fg">{contact.contactUser?.displayName}</span>
                        <button
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          className="rounded-lg p-1 text-muted hover:bg-surface-3 hover:text-fg"
                          title="Cancel request"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
