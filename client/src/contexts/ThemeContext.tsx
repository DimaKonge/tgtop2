import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Appearance = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";
export type ThemeStyle = "original" | "clean";
export type ThemeAccent = "blue" | "purple" | "rose" | "gold" | "green" | "turquoise";
export type ThemeBackground = "black" | "onyx" | "midnight" | "indigo" | "cobalt" | "electric" | "plum" | "burgundy" | "forest" | "jade" | "turquoise" | "navy" | "steel" | "ivory";
export const THEME_BACKGROUND_OPTIONS: Array<{ value: ThemeBackground; label: string; color: string; tone: "dark" | "light" }> = [
  { value: "black", label: "Black", color: "#05070a", tone: "dark" },
  { value: "onyx", label: "Onyx Black", color: "#111318", tone: "dark" },
  { value: "midnight", label: "Midnight Blue", color: "#101a2d", tone: "dark" },
  { value: "indigo", label: "Indigo Dye", color: "#17213b", tone: "dark" },
  { value: "cobalt", label: "Cobalt Blue", color: "#152b52", tone: "dark" },
  { value: "electric", label: "Electric Purple", color: "#241a45", tone: "dark" },
  { value: "plum", label: "Dark Plum", color: "#351b3b", tone: "dark" },
  { value: "burgundy", label: "Burgundy", color: "#3b1e2a", tone: "dark" },
  { value: "forest", label: "Forest Green", color: "#17352d", tone: "dark" },
  { value: "jade", label: "Jade Green", color: "#16443f", tone: "dark" },
  { value: "turquoise", label: "Turquoise", color: "#123a45", tone: "dark" },
  { value: "navy", label: "Navy Blue", color: "#172a45", tone: "dark" },
  { value: "steel", label: "Steel Grey", color: "#536171", tone: "dark" },
  { value: "ivory", label: "Ivory White", color: "#f3efe6", tone: "light" },
];

interface ThemeContextType {
  appearance: Appearance;
  resolvedTheme: ResolvedTheme;
  setAppearance: (appearance: Appearance) => void;
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  background: ThemeBackground;
  setBackground: (background: ThemeBackground) => void;
  theme: ResolvedTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const APPEARANCE_STORAGE_KEY = "tg-top-appearance";
const STYLE_STORAGE_KEY = "tg-top-style";
const ACCENT_STORAGE_KEY = "tg-top-accent";
const BACKGROUND_STORAGE_KEY = "tg-top-background";

function getSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return stored === "light" || stored === "system" ? stored : "dark";
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [style, setStyle] = useState<ThemeStyle>(() => localStorage.getItem(STYLE_STORAGE_KEY) === "original" ? "original" : "clean");
  const [accent, setAccent] = useState<ThemeAccent>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ["blue", "purple", "rose", "gold", "green", "turquoise"].includes(stored ?? "") ? stored as ThemeAccent : "blue";
  });
  const [background, setBackground] = useState<ThemeBackground>(() => {
    const stored = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    return THEME_BACKGROUND_OPTIONS.some(item => item.value === stored) ? stored as ThemeBackground : "black";
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
    const backgroundTone = THEME_BACKGROUND_OPTIONS.find(item => item.value === background)?.tone ?? "dark";
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.background = background;
    document.documentElement.dataset.backgroundTone = backgroundTone;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
    localStorage.setItem(STYLE_STORAGE_KEY, style);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    localStorage.setItem(BACKGROUND_STORAGE_KEY, background);
  }, [appearance, resolvedTheme, style, accent, background]);

  const value = useMemo(() => ({
    appearance,
    resolvedTheme,
    setAppearance,
    style,
    setStyle,
    accent,
    setAccent,
    background,
    setBackground,
    theme: resolvedTheme,
    toggleTheme: () => setAppearance(resolvedTheme === "dark" ? "light" : "dark"),
  }), [appearance, resolvedTheme, style, accent, background]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
