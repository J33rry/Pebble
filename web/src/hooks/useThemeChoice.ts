"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

/**
 * Current theme choice plus a setter. Persists an explicit choice to
 * localStorage and reflects it via <html data-theme>. "System" clears the
 * override so prefers-color-scheme takes over. Pairs with the no-FOUC init
 * script in app/layout.tsx.
 */
export function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  // Read the persisted choice after mount. Doing this in an effect (rather than
  // a lazy initializer) is deliberate: it keeps the server and first client
  // render identical ("system") so there's no hydration mismatch.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync of persisted theme after mount
    setChoice(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  const apply = (next: ThemeChoice) => {
    setChoice(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    }
  };

  return [choice, apply] as const;
}
