"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { applyTheme, currentTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const serverTheme = (): Theme => "light";

// One control with two states. It names the theme that a click gives.
// `icon` is the form for the header: the same control as an icon with a spoken name.
export function ThemeToggle({ icon = false }: { icon?: boolean }) {
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  const name = theme === "dark" ? "Light theme" : "Dark theme";
  const change = () => applyTheme(theme === "dark" ? "light" : "dark");
  if (icon) {
    return (
      <button type="button" className="theme-icon" aria-label={name} title={name} onClick={change}>
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </button>
    );
  }
  return (
    <button type="button" className="theme-toggle" onClick={change}>
      {name}
    </button>
  );
}
