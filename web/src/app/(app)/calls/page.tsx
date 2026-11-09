"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Phone, Search, Star, Video } from "lucide-react";
import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { CallsSidebar, useCallEntries } from "@/components/layout/CallsSidebar";
import { CallsWater } from "@/components/calls/CallsWater";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { contactsApi } from "@/lib/api/contacts";
import { User } from "@/lib/api/users";
import { useFavorites } from "@/hooks/useFavorites";
import { useOpenDm } from "@/hooks/useOpenDm";
import { useCallStore } from "@/hooks/useCall";

function StartCallPicker({
  type,
  onClose,
  people,
}: {
  type: "audio" | "video" | null;
  onClose: () => void;
  people: User[];
}) {
  const { openDm } = useOpenDm();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = people.filter(
    (u) => !q || u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  );

  return (
    <Modal isOpen={type !== null} onClose={onClose} title={type === "video" ? "Start a video call" : "Start a voice call"}>
      <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-muted focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="h-5 w-5 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full bg-transparent text-[15px] text-fg placeholder:text-muted focus:outline-none"
        />
      </label>
      <ul className="mt-3 max-h-80 overflow-y-auto">
        {matches.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted">
            {people.length === 0 ? (
              <>
                No contacts yet.{" "}
                <Link href="/contacts" onClick={onClose} className="text-accent">Find people</Link>
              </>
            ) : (
              "No contacts match."
            )}
          </li>
        ) : (
          matches.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => {
                  onClose();
                  openDm(u.id, type!);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface-2 transition-colors"
              >
                <Avatar src={u.avatarUrl} name={u.displayName} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-fg truncate">{u.displayName}</span>
                  <span className="block text-sm text-muted truncate">@{u.username}</span>
                </span>
                {type === "video" ? <Video className="h-5 w-5 text-accent" /> : <Phone className="h-5 w-5 text-accent" />}
              </button>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}

function CallsHome() {
  const [picker, setPicker] = useState<"audio" | "video" | null>(null);
  const favorites = useFavorites();
  const { openDm } = useOpenDm();
  const { entries } = useCallEntries();
  const callState = useCallStore((s) => s.callState);

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
  });
  const people = [
    ...new Map(
      (contactsData?.contacts || [])
        .filter((c) => c.status === "accepted" && c.contactUser)
        .map((c) => [c.contactUser!.id, c.contactUser!])
    ).values(),
  ];

  // Starred contacts; until there are any, fall back to who you call most.
  const starred = people.filter((u) => favorites.ids.includes(u.id));
  const frequency = new Map<string, { user: User; n: number }>();
  for (const e of entries) {
    if (!e.peer) continue;
    const f = frequency.get(e.peer.id) || { user: e.peer, n: 0 };
    f.n++;
    frequency.set(e.peer.id, f);
  }
  const frequent = [...frequency.values()].sort((a, b) => b.n - a.n).map((f) => f.user);
  const shortlist = (starred.length ? starred : frequent).slice(0, 4);

  return (
    <>
      <CallsWater
        onVoice={() => setPicker("audio")}
        onVideo={() => setPicker("video")}
        disabled={callState !== "idle"}
      >
        {shortlist.length > 0 && (
          <div className="relative mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {shortlist.map((u) => (
              <div key={u.id} className="relative rounded-2xl bg-surface-2 p-4 text-center">
                {starred.length > 0 && (
                  <Star className="absolute right-4 top-4 h-4 w-4 fill-warning text-warning" />
                )}
                <Avatar src={u.avatarUrl} name={u.displayName} size="xl" className="mx-auto" />
                <p className="mt-2.5 font-semibold text-fg truncate">{u.displayName}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => openDm(u.id, "audio")}
                    disabled={callState !== "idle"}
                    className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                    title={`Call ${u.displayName}`}
                  >
                    <Phone className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => openDm(u.id, "video")}
                    disabled={callState !== "idle"}
                    className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                    title={`Video call ${u.displayName}`}
                  >
                    <Video className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CallsWater>
      <StartCallPicker type={picker} onClose={() => setPicker(null)} people={people} />
    </>
  );
}

export default function CallsIndexPage() {
  return (
    <TwoPaneLayout
      sidebar={<CallsSidebar />}
      main={<CallsHome />}
      showMainOnMobile={false}
    />
  );
}
