import type { CSSProperties } from "react";
import { THEME_BACKGROUND_OPTIONS } from "@/contexts/ThemeContext";

export function getCommunityCardBackgroundStyle(preset?: string | null): CSSProperties | undefined {
  const palette = THEME_BACKGROUND_OPTIONS.find(item => item.value === preset);
  if (!palette) return undefined;
  return {
    "--tg-community-card-bg": palette.color,
    "--tg-community-card-accent": palette.accent,
  } as CSSProperties;
}
