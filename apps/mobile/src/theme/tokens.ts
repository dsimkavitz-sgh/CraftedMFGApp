import { useColorScheme } from "react-native";

export interface Palette {
  isDark: boolean;
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentPressed: string;
  /** Text/icon color rendered on top of `accent` surfaces. */
  accentInk: string;
  success: string;
  info: string;
  warn: string;
  danger: string;
}

const status = {
  success: "#059669",
  info: "#0284c7",
  warn: "#d97706",
  danger: "#e11d48",
} as const;

// Monochrome identity matching craftedmfg.com: white/stone surfaces with an
// ink-black accent that inverts to white in dark mode. Status colors stay
// colorful for scanability.
export const lightPalette: Palette = {
  isDark: false,
  bg: "#fafaf9",
  card: "#ffffff",
  border: "#e7e5e4",
  text: "#1c1917",
  muted: "#78716c",
  accent: "#1c1917",
  accentPressed: "#44403c",
  accentInk: "#ffffff",
  ...status,
};

export const darkPalette: Palette = {
  isDark: true,
  bg: "#0c0a09",
  card: "#1c1917",
  border: "#292524",
  text: "#fafaf9",
  muted: "#a8a29e",
  accent: "#fafaf9",
  accentPressed: "#d6d3d1",
  accentInk: "#1c1917",
  ...status,
};

/** spacing(n) = 4n pt. */
export function spacing(n: number): number {
  return n * 4;
}

export const radius = {
  card: 16,
  control: 12,
  pill: 999,
} as const;

/** Current color palette based on the system appearance. */
export function useTheme(): Palette {
  return useColorScheme() === "dark" ? darkPalette : lightPalette;
}

/** Translucent tint of a hex color (for badge backgrounds etc). */
export function tint(hexColor: string, alphaHex = "22"): string {
  return `${hexColor}${alphaHex}`;
}
