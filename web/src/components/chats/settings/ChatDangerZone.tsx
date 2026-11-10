"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { chatsApi } from "@/lib/api/chats";

export function ChatDangerZone({
  chatId,
  canDelete,
  onClose,
}: {
  chatId: string;
  canDelete: boolean;
  onClose: () => void;
}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => chatsApi.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onClose();
      router.push("/");
      toast("Group deleted", "info");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => chatsApi.removeParticipant(chatId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onClose();
      router.push("/");
      toast("Left group", "info");
    },
  });

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <Button
        variant="outline"
        className="w-full text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
        leftIcon={<LogOut className="w-4 h-4" />}
        isLoading={leaveMutation.isPending}
        onClick={() => {
          if (confirm("Are you sure you want to leave this chat?")) {
            leaveMutation.mutate();
          }
        }}
      >
        Leave Conversation
      </Button>

      {canDelete && (
        <Button
          variant="danger"
          className="w-full"
          leftIcon={<Trash2 className="w-4 h-4" />}
          isLoading={deleteMutation.isPending}
          onClick={() => {
            if (confirm("Are you absolutely sure you want to delete this group? This cannot be undone.")) {
              deleteMutation.mutate();
            }
          }}
        >
          Delete Group
        </Button>
      )}
    </div>
  );
}
