"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, currentTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const serverTheme = (): Theme => "light";

// One control with two states. It names the theme that a click gives.
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  return (
    <button type="button" className="theme-toggle" onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "Light theme" : "Dark theme"}
    </button>
  );
}
