"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { chatsApi, type Chat } from "@/lib/api/chats";
import { contactsApi } from "@/lib/api/contacts";

export function AddMembersPanel({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const chatId = chat.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.getContacts,
  });

  const addMembersMutation = useMutation({
    mutationFn: () => chatsApi.addParticipants(chatId, selectedContacts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      onClose();
      toast("Members added", "success");
    },
  });

  return (
    <div className="bg-surface-2/40 border border-border rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-fg">Select Contacts</h4>
        <button onClick={() => onClose()} className="text-faint hover:text-fg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1">
        {contactsData?.contacts
          .filter((c) => c.status === "accepted")
          .map((contact) => {
            const contactUser = contact.contactUser;
            const isAlreadyMember = chat.participants?.some((p) => p.userId === contactUser?.id);
            if (isAlreadyMember || !contactUser) return null;

            const isSelected = selectedContacts.includes(contactUser.id);
            return (
              <div
                key={contact.id}
                onClick={() =>
                  setSelectedContacts((prev) =>
                    isSelected ? prev.filter((id) => id !== contactUser.id) : [...prev, contactUser.id],
                  )
                }
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2/60 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="w-4 h-4 rounded border-border text-accent bg-surface-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-fg truncate">{contactUser.displayName}</p>
                  <p className="text-[11px] text-faint truncate">@{contactUser.username}</p>
                </div>
              </div>
            );
          })}
      </div>

      <Button
        variant="primary"
        className="w-full"
        disabled={selectedContacts.length === 0}
        isLoading={addMembersMutation.isPending}
        onClick={() => addMembersMutation.mutate()}
      >
        Add {selectedContacts.length} Member(s)
      </Button>
    </div>
  );
}
