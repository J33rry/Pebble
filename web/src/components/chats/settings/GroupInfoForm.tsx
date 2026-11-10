"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { chatsApi, type Chat } from "@/lib/api/chats";

export function GroupInfoForm({ chat, isAdmin }: { chat: Chat; isAdmin: boolean }) {
  const chatId = chat.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(chat.name || "");
  const [description, setDescription] = useState(chat.description || "");

  const updateMutation = useMutation({
    mutationFn: () => chatsApi.updateChat(chatId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast("Group details updated!", "success");
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-semibold text-muted uppercase tracking-wider">Group Info</h3>
      <div className="space-y-3">
        <Input
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isAdmin || updateMutation.isPending}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isAdmin || updateMutation.isPending}
          rows={2}
        />
        {isAdmin && (name !== chat.name || description !== chat.description) && (
          <Button
            variant="primary"
            className="w-full"
            isLoading={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}
