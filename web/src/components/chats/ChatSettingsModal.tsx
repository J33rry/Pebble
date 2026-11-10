"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { chatsApi } from "@/lib/api/chats";
import { AddMembersPanel } from "./settings/AddMembersPanel";
import { ChatDangerZone } from "./settings/ChatDangerZone";
import { ChatMemberRow } from "./settings/ChatMemberRow";
import { GroupInfoForm } from "./settings/GroupInfoForm";

interface ChatSettingsModalProps {
  chatId: string;
  onClose: () => void;
}

export function ChatSettingsModal({ chatId, onClose }: ChatSettingsModalProps) {
  const { user: currentUser } = useAuth();
  const [showAddMembers, setShowAddMembers] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => (await chatsApi.getChatDetails(chatId)).chat,
  });

  if (isLoading || !data) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Loading...">
        <div className="py-2 text-center text-xs text-faint">Loading details...</div>
      </Modal>
    );
  }

  const myParticipant = data.participants?.find((p) => p.userId === currentUser?.id);
  const isAdmin = myParticipant?.role === "admin";
  const isGroup = data.type === "group";

  return (
    <Modal isOpen={true} onClose={onClose} title={isGroup ? "Group Settings" : "Chat Details"} maxWidth="md">
      <div className="space-y-6">
        {/* Info Section */}
        {isGroup && <GroupInfoForm key={data.updatedAt} chat={data} isAdmin={isAdmin} />}

        {/* Participants Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono font-semibold text-muted uppercase tracking-wider">
              Participants ({data.participants?.length || 0})
            </h3>
            {isGroup && isAdmin && !showAddMembers && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Members
              </button>
            )}
          </div>

          {showAddMembers && <AddMembersPanel chat={data} onClose={() => setShowAddMembers(false)} />}

          <div className="space-y-1">
            {data.participants?.map((p) => (
              <ChatMemberRow key={p.id} participant={p} chatId={chatId} canManage={isGroup && isAdmin} />
            ))}
          </div>
        </div>

        <ChatDangerZone chatId={chatId} canDelete={isGroup && isAdmin} onClose={onClose} />
      </div>
    </Modal>
  );
}
