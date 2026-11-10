"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldAlert, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { chatsApi, type ChatParticipant } from "@/lib/api/chats";

export function ChatMemberRow({
  participant: p,
  chatId,
  canManage,
}: {
  participant: ChatParticipant;
  chatId: string;
  canManage: boolean;
}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = usePresence();
  const { toast } = useToast();

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.removeParticipant(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      toast("Member removed", "info");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.updateParticipantRole(chatId, userId, "admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      toast("Promoted to admin", "success");
    },
  });

  return (
    <div
      key={p.id}
      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-2/40 group transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          src={p.user?.avatarUrl}
          name={p.user?.displayName || p.user?.username}
          size="md"
          showPresence
          isOnline={isOnline(p.userId)}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg truncate flex items-center gap-1.5">
            {p.userId === currentUser?.id ? "You" : p.user?.displayName}
            {p.role === "admin" && <Shield className="w-3.5 h-3.5 text-accent" />}
          </p>
          <p className="text-[11px] text-faint font-mono truncate">@{p.user?.username}</p>
        </div>
      </div>

      {canManage && p.userId !== currentUser?.id && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {p.role !== "admin" && (
            <button
              onClick={() => promoteMutation.mutate(p.userId)}
              disabled={promoteMutation.isPending}
              className="p-1.5 text-muted hover:text-accent rounded-lg hover:bg-surface-2 transition-colors"
              title="Make Admin"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Remove ${p.user?.displayName} from the group?`)) {
                removeMemberMutation.mutate(p.userId);
              }
            }}
            disabled={removeMemberMutation.isPending}
            className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-surface-2 transition-colors"
            title="Remove Member"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
