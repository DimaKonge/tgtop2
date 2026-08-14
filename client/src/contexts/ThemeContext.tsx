import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Appearance = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  appearance: Appearance;
  resolvedTheme: ResolvedTheme;
  setAppearance: (appearance: Appearance) => void;
  theme: ResolvedTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const APPEARANCE_STORAGE_KEY = "tg-top-appearance";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemPrefersDark(query.matches);
    query.addEventListener("change", updateSystemTheme);
    return () => query.removeEventListener("change", updateSystemTheme);
  }, []);

  const resolvedTheme: ResolvedTheme = appearance === "system" ? (systemPrefersDark ? "dark" : "light") : appearance;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  }, [appearance, resolvedTheme]);

  const value = useMemo(() => ({
    appearance,
    resolvedTheme,
    setAppearance,
    theme: resolvedTheme,
    toggleTheme: () => setAppearance(resolvedTheme === "dark" ? "light" : "dark"),
  }), [appearance, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
