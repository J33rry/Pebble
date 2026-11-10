import { Avatar } from "@/components/ui/Avatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 self-start items-center mt-3 animate-in-slide">
      <Avatar size="sm" className="opacity-70" />
      <div className="bg-surface-2 text-muted rounded-[18px] px-5 py-3.5 flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
