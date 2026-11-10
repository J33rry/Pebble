import type { Chat } from "@/lib/api/chats";

/** The other person in a DM; null for groups. */
export function otherParticipant(chat: Chat, currentUserId: string | undefined) {
  if (chat.type === "group") return null;
  return chat.participants?.find((p) => p.userId !== currentUserId)?.user;
}

export function chatTitle(chat: Chat, currentUserId: string | undefined) {
  if (chat.type === "group") return chat.name || "Unnamed Group";
  return otherParticipant(chat, currentUserId)?.displayName || "Unknown User";
}
