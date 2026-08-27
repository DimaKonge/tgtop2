import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Appearance = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";
export type ThemeStyle = "original" | "clean";
export type ThemeAccent = "blue" | "purple" | "rose" | "gold" | "green" | "turquoise";

interface ThemeContextType {
  appearance: Appearance;
  resolvedTheme: ResolvedTheme;
  setAppearance: (appearance: Appearance) => void;
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  theme: ResolvedTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const APPEARANCE_STORAGE_KEY = "tg-top-appearance";
const STYLE_STORAGE_KEY = "tg-top-style";
const ACCENT_STORAGE_KEY = "tg-top-accent";

function getSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return stored === "light" || stored === "system" ? stored : "dark";
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [style, setStyle] = useState<ThemeStyle>(() => localStorage.getItem(STYLE_STORAGE_KEY) === "clean" ? "clean" : "original");
  const [accent, setAccent] = useState<ThemeAccent>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ["blue", "purple", "rose", "gold", "green", "turquoise"].includes(stored ?? "") ? stored as ThemeAccent : "blue";
  });

  const resolvedTheme: ResolvedTheme = appearance === "system" ? systemTheme : appearance;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(media.matches ? "light" : "dark");
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.style = style;
    document.documentElement.dataset.accent = accent;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
    localStorage.setItem(STYLE_STORAGE_KEY, style);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [appearance, resolvedTheme, style, accent]);

  const value = useMemo(() => ({
    appearance,
    resolvedTheme,
    setAppearance,
    style,
    setStyle,
    accent,
    setAccent,
    theme: resolvedTheme,
    toggleTheme: () => setAppearance(resolvedTheme === "dark" ? "light" : "dark"),
  }), [appearance, resolvedTheme, style, accent]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
