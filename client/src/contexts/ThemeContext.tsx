import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/** TG TOP intentionally uses one dark Telegram-style surface system. */
export type Appearance = "dark";
export type ResolvedTheme = "dark";
export type ThemeStyle = "original" | "clean";
export type ThemeAccent = "blue" | "purple" | "rose" | "gold" | "green" | "turquoise";
export const THEME_BACKGROUND_OPTIONS = [
  { value: "black", label: "Black", color: "#080a0e", accent: "#3f8cff" },
  { value: "ivory_white", label: "White", color: "#f4f6fa", accent: "#0f172a" },
  { value: "onyx_black", label: "Onyx Black", color: "#111318", accent: "#b2bbc8" },
  { value: "turquoise", label: "Turquoise", color: "#123a45", accent: "#4fd4d0" },
  { value: "deep_cyan", label: "Deep Cyan", color: "#11404a", accent: "#3ed4e3" },
  { value: "aquamarine", label: "Aquamarine", color: "#174a4a", accent: "#67d9ca" },
  { value: "pacific_cyan", label: "Pacific Cyan", color: "#16495a", accent: "#62c8e7" },
  { value: "feldgrau", label: "Feldgrau", color: "#2a3636", accent: "#8faaa7" },
  { value: "moonstone", label: "Moonstone", color: "#294853", accent: "#8cc9d9" },
  { value: "silver_blue", label: "Silver Blue", color: "#334753", accent: "#a4c5d7" },
  { value: "celtic_blue", label: "Celtic Blue", color: "#153b66", accent: "#459cff" },
  { value: "french_blue", label: "French Blue", color: "#1f4668", accent: "#69b8f0" },
  { value: "azure_blue", label: "Azure Blue", color: "#1d4d6c", accent: "#67c1f1" },
  { value: "sky_blue", label: "Sky Blue", color: "#24536c", accent: "#72c6ee" },
  { value: "sapphire", label: "Sapphire", color: "#234976", accent: "#78aaf8" },
  { value: "navy_blue", label: "Navy Blue", color: "#172a45", accent: "#7ab6ff" },
  { value: "steel_grey", label: "Steel Grey", color: "#27313e", accent: "#a8bfd8" },
  { value: "roman_silver", label: "Roman Silver", color: "#37404b", accent: "#bdc5d0" },
  { value: "platinum", label: "Platinum", color: "#3b4249", accent: "#d0d6dc" },
  { value: "seal_brown", label: "Seal Brown", color: "#321414", accent: "#bf6e49" },
  { value: "chocolate", label: "Chocolate", color: "#381a13", accent: "#cf7344" },
  { value: "battleship_grey", label: "Battleship Grey", color: "#283039", accent: "#bcc5cd" },
  { value: "midnight_blue", label: "Midnight Blue", color: "#101a2d", accent: "#6ea8ff" },
  { value: "marine_blue", label: "Marine Blue", color: "#102946", accent: "#3a96f3" },
  { value: "indigo_dye", label: "Indigo Dye", color: "#17213b", accent: "#8f8cff" },
  { value: "cobalt_blue", label: "Cobalt Blue", color: "#152b52", accent: "#5b9dff" },
  { value: "neon_blue", label: "Neon Blue", color: "#192860", accent: "#759cff" },
  { value: "electric_indigo", label: "Electric Indigo", color: "#2b2364", accent: "#9b91ff" },
  { value: "cyberpunk", label: "Cyberpunk", color: "#2b2354", accent: "#b285ff" },
  { value: "lavender", label: "Lavender", color: "#38264c", accent: "#c199ff" },
  { value: "electric_purple", label: "Electric Purple", color: "#402060", accent: "#d083ff" },
  { value: "french_violet", label: "French Violet", color: "#3a1753", accent: "#b84df5" },
  { value: "grape", label: "Grape", color: "#40254f", accent: "#c98cec" },
  { value: "purple", label: "Purple", color: "#432347", accent: "#cf89df" },
  { value: "english_violet", label: "English Violet", color: "#2f1f3a", accent: "#bd8ccf" },
  { value: "dark_lilac", label: "Dark Lilac", color: "#492b4f", accent: "#d092df" },
  { value: "fandango", label: "Fandango", color: "#54294a", accent: "#ef85c1" },
  { value: "mystic_pearl", label: "Mystic Pearl", color: "#553039", accent: "#e7969c" },
  { value: "raspberry", label: "Raspberry", color: "#5a2439", accent: "#f282a7" },
  { value: "mexican_pink", label: "Mexican Pink", color: "#5b193d", accent: "#f03d8d" },
  { value: "burgundy", label: "Burgundy", color: "#3b1e2a", accent: "#ec7b9d" },
  { value: "carmine", label: "Carmine", color: "#54191c", accent: "#e84242" },
  { value: "fire_engine", label: "Fire Engine", color: "#5c1b1b", accent: "#ff4d45" },
  { value: "strawberry", label: "Strawberry", color: "#5d2830", accent: "#f18a8a" },
  { value: "coral_red", label: "Coral Red", color: "#592b29", accent: "#f38d78" },
  { value: "tomato", label: "Tomato", color: "#582a20", accent: "#f26444" },
  { value: "persimmon", label: "Persimmon", color: "#5d3325", accent: "#f5a06c" },
  { value: "burnt_sienna", label: "Burnt Sienna", color: "#512818", accent: "#e26c39" },
  { value: "carrot_juice", label: "Carrot Juice", color: "#5c3020", accent: "#f69b63" },
  { value: "orange", label: "Orange", color: "#57351f", accent: "#f1a555" },
  { value: "copper", label: "Copper", color: "#533621", accent: "#df9a55" },
  { value: "chestnut", label: "Chestnut", color: "#4b2924", accent: "#d67a65" },
  { value: "rosewood", label: "Rosewood", color: "#45272a", accent: "#cc7f86" },
  { value: "cappuccino", label: "Cappuccino", color: "#40332d", accent: "#d0ad99" },
  { value: "mustard", label: "Mustard", color: "#4d3916", accent: "#e3ad33" },
  { value: "amber", label: "Amber", color: "#513a1d", accent: "#f3bf4f" },
  { value: "caramel", label: "Caramel", color: "#50371e", accent: "#e7ad5b" },
  { value: "pure_gold", label: "Pure Gold", color: "#4c3d1d", accent: "#f4c34e" },
  { value: "satin_gold", label: "Satin Gold", color: "#4a401f", accent: "#e1c362" },
  { value: "old_gold", label: "Old Gold", color: "#483b1c", accent: "#d2ab4c" },
  { value: "desert_sand", label: "Desert Sand", color: "#443a31", accent: "#d4ba9b" },
  { value: "light_olive", label: "Light Olive", color: "#414224", accent: "#d0cc7c" },
  { value: "khaki_green", label: "Khaki Green", color: "#3c4124", accent: "#bfc878" },
  { value: "lemongrass", label: "Lemongrass", color: "#344425", accent: "#a9d36f" },
  { value: "shamrock_green", label: "Shamrock Green", color: "#28452c", accent: "#78d77b" },
  { value: "malachite", label: "Malachite", color: "#24482f", accent: "#65d783" },
  { value: "camo_green", label: "Camo Green", color: "#2f3c21", accent: "#90b56b" },
  { value: "ranger_green", label: "Ranger Green", color: "#273423", accent: "#81a87b" },
  { value: "dark_green", label: "Dark Green", color: "#19331b", accent: "#52be5c" },
  { value: "rifle_green", label: "Rifle Green", color: "#293229", accent: "#8fa38e" },
  { value: "gunship_green", label: "Gunship Green", color: "#20342d", accent: "#70ae97" },
  { value: "tactical_pine", label: "Tactical Pine", color: "#1b3a36", accent: "#53c1b1" },
  { value: "pine_green", label: "Pine Green", color: "#214239", accent: "#60c896" },
  { value: "hunter_green", label: "Hunter Green", color: "#283f2c", accent: "#87bf80" },
  { value: "pistachio", label: "Pistachio", color: "#3d5233", accent: "#a8cf77" },
  { value: "emerald", label: "Emerald", color: "#21523b", accent: "#58d684" },
  { value: "mint_green", label: "Mint Green", color: "#28593d", accent: "#73dd99" },
  { value: "pacific_green", label: "Pacific Green", color: "#1f564b", accent: "#59d4af" },
  { value: "jade_green", label: "Jade Green", color: "#1b5546", accent: "#54d6b7" },
] as const;
export type ThemeBackground = (typeof THEME_BACKGROUND_OPTIONS)[number]["value"];

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
const STYLE_STORAGE_KEY = "tg-top-style";
const ACCENT_STORAGE_KEY = "tg-top-accent";
const BACKGROUND_STORAGE_KEY = "tg-top-background";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance: Appearance = "dark";
  const resolvedTheme: ResolvedTheme = "dark";
  const [style, setStyle] = useState<ThemeStyle>(() => localStorage.getItem(STYLE_STORAGE_KEY) === "original" ? "original" : "clean");
  const [accent, setAccent] = useState<ThemeAccent>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ["blue", "purple", "rose", "gold", "green", "turquoise"].includes(stored ?? "") ? stored as ThemeAccent : "blue";
  });
  const [background, setBackground] = useState<ThemeBackground>(() => {
    const stored = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    return THEME_BACKGROUND_OPTIONS.some(item => item.value === stored) ? stored as ThemeBackground : "black";
  });

  useEffect(() => {
    const palette = THEME_BACKGROUND_OPTIONS.find(item => item.value === background) ?? THEME_BACKGROUND_OPTIONS[0];
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.style = style;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.background = background;
    document.documentElement.dataset.backgroundTone = "dark";
    document.documentElement.style.setProperty("--tg-shell-bg", palette.color);
    document.documentElement.style.setProperty("--tg-surface", `color-mix(in srgb, ${palette.color} 78%, #182230)`);
    document.documentElement.style.setProperty("--tg-surface-raised", `color-mix(in srgb, ${palette.color} 66%, #263548)`);
    document.documentElement.style.setProperty("--tg-accent", palette.accent);
    document.documentElement.style.setProperty("--tg-accent-soft", `color-mix(in srgb, ${palette.accent} 18%, transparent)`);
    document.documentElement.style.setProperty("--tg-accent-border", `color-mix(in srgb, ${palette.accent} 42%, transparent)`);
    document.documentElement.classList.add("dark");
    localStorage.setItem(STYLE_STORAGE_KEY, style);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    localStorage.setItem(BACKGROUND_STORAGE_KEY, background);
  }, [style, accent, background]);

  const value = useMemo(() => ({
    appearance,
    resolvedTheme,
    setAppearance: () => undefined,
    style,
    setStyle,
    accent,
    setAccent,
    background,
    setBackground,
    theme: resolvedTheme,
    toggleTheme: () => undefined,
  }), [style, accent, background]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
