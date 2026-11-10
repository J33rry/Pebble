import type { Message } from "@/lib/api/messages";
import type { Call } from "@/lib/api/calls";

export type TimelineItem =
  { type: "message"; data: Message; timestamp: number } | { type: "call"; data: Call; timestamp: number };

/** Messages and calls merged into one oldest-first list. */
export function buildTimeline(messages: Message[], calls: Call[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      type: "message" as const,
      data: m,
      timestamp: new Date(m.createdAt).getTime(),
    })),
    ...calls.map((c) => ({
      type: "call" as const,
      data: c,
      timestamp: new Date(c.startedAt).getTime(),
    })),
  ];
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

/** The closest message before `index`, skipping over call entries. */
export function previousMessage(items: TimelineItem[], index: number): Message | null {
  for (let i = index - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type === "message") return item.data;
  }
  return null;
}
