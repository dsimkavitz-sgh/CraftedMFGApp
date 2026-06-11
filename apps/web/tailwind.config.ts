import type { Config } from "tailwindcss";

/**
 * Design tokens for Crafted MFG.
 *
 * - brand: amber accent (amber-600 primary, amber-500 hover)
 * - surfaces: stone scale (stone-50 bg / white cards light; stone-950 / stone-900 dark)
 * - semantic status colors: emerald (success/received), sky (in transit/ordered),
 *   amber (pending/in production), rose (error/exception/cancelled), stone (draft)
 *
 * CSS variables live in src/app/globals.css so dark mode follows the OS
 * (darkMode: "media") without re-declaring palettes per component.
 */
const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          hover: "rgb(var(--brand-hover) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
