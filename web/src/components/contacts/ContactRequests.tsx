"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, ChevronRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { contactsApi, type Contact } from "@/lib/api/contacts";
import { primaryBtn, softBtn } from "./buttonStyles";

export function ContactRequests({ incomingRequests }: { incomingRequests: Contact[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAllRequests, setShowAllRequests] = useState(false);

  const respondRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      contactsApi.respondToRequest(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast(`Contact request ${variables.status}`, "info");
    },
  });

  const visibleRequests = showAllRequests ? incomingRequests : incomingRequests.slice(0, 3);

  return (
    <section className="rounded-3xl bg-surface-2/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-[24px] font-semibold text-fg tracking-tight">
            Contact requests
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-[13px] font-semibold text-danger-fg">
              {incomingRequests.length}
            </span>
          </h2>
          <p className="text-muted">People who want to connect with you.</p>
        </div>
        {incomingRequests.length > 3 && (
          <button
            onClick={() => setShowAllRequests((v) => !v)}
            className="flex items-center gap-1 text-[15px] text-accent hover:text-accent-hover whitespace-nowrap"
          >
            {showAllRequests ? "Show fewer" : "View all requests"}
            <ChevronRight className={clsx("h-4 w-4 transition-transform", showAllRequests && "rotate-90")} />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {visibleRequests.map((contact) => {
          const u = contact.contactUser;
          return (
            <div key={contact.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
              <div className="flex gap-3.5">
                <Avatar
                  src={u?.avatarUrl}
                  name={u?.displayName}
                  size="xl"
                  className="[&>div]:!w-[72px] [&>div]:!h-[72px]"
                />
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-fg truncate">{u?.displayName}</p>
                  <p className="text-sm text-muted truncate">@{u?.username}</p>
                  {u?.bio && <p className="mt-1.5 text-sm text-muted line-clamp-2">{u.bio}</p>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => respondRequestMutation.mutate({ id: contact.id, status: "accepted" })}
                  disabled={respondRequestMutation.isPending}
                  className={primaryBtn}
                >
                  <Check className="h-4 w-4" /> Accept
                </button>
                <button
                  onClick={() => respondRequestMutation.mutate({ id: contact.id, status: "rejected" })}
                  disabled={respondRequestMutation.isPending}
                  className={clsx(softBtn, "!text-fg")}
                >
                  <X className="h-4 w-4" /> Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
