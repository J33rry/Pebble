"use client";

import clsx from "clsx";
import { Monitor } from "lucide-react";
import { useThemeChoice, type ThemeChoice } from "@/hooks/useThemeChoice";

/** A tiny app window used as the preview on each theme card. */
function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const dark = mode === "dark";
  return (
    <div className={clsx("flex h-full w-full overflow-hidden", dark ? "bg-[#2a2933]" : "bg-white")}>
      <div
        className={clsx(
          "flex w-5 flex-col items-center gap-1.5 pt-2",
          dark ? "bg-[#1c1b22]" : "bg-[#8d8ef6]",
        )}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className={clsx("h-1.5 w-1.5 rounded-full", dark ? "bg-white/40" : "bg-white/80")} />
        ))}
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <span className={clsx("block h-2 w-1/3 rounded-full", dark ? "bg-white/25" : "bg-[#d9d9fb]")} />
        <span className={clsx("block h-2 w-full rounded-full", dark ? "bg-white/15" : "bg-[#e7e7fd]")} />
        <span className={clsx("block h-2 w-2/3 rounded-full", dark ? "bg-white/15" : "bg-[#e7e7fd]")} />
      </div>
    </div>
  );
}

const THEMES: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "A clean, bright look." },
  { value: "dark", label: "Dark", hint: "A focused, low-light look." },
  { value: "system", label: "System", hint: "Match your device setting." },
];

export function AppearanceSection() {
  const [theme, setTheme] = useThemeChoice();

  return (
    <section className="grid gap-6 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex gap-4 lg:border-r lg:border-border-strong lg:pr-6">
        <Monitor className="h-7 w-7 shrink-0 text-accent" />
        <div>
          <h2 className="text-[24px] font-semibold text-fg tracking-tight">Appearance</h2>
          <p className="text-muted">Choose how Pebble looks for you.</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-3">
        {THEMES.map((t) => {
          const active = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(t.value)}
              className={clsx(
                "rounded-2xl border-2 bg-surface p-4 text-left transition-colors",
                active ? "border-accent" : "border-transparent hover:border-border-strong",
              )}
            >
              <div className="mx-auto h-[72px] w-[124px] overflow-hidden rounded-lg shadow-[var(--shadow-sm)] ring-1 ring-border">
                {t.value === "system" ? (
                  <div className="relative h-full w-full">
                    <ThemePreview mode="light" />
                    <div className="absolute inset-0 [clip-path:polygon(70%_0,100%_0,100%_100%,35%_100%)]">
                      <ThemePreview mode="dark" />
                    </div>
                  </div>
                ) : (
                  <ThemePreview mode={t.value} />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className={clsx(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    active ? "border-accent" : "border-muted",
                  )}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
                <span className="text-[17px] font-semibold text-fg">{t.label}</span>
              </div>
              <p className="mt-0.5 pl-[30px] text-sm text-muted">{t.hint}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
