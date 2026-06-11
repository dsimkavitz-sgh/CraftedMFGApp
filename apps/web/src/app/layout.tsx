import type { Metadata, Viewport } from "next";
import { Archivo, Comfortaa } from "next/font/google";
import "./globals.css";

// Grotesque sans matching the craftedmfg.com brand typography.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Rounded geometric used only for the "Crafted" logo wordmark.
const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Crafted MFG",
    template: "%s · Crafted MFG",
  },
  description: "Inventory, catalog, and purchase orders for Crafted MFG.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${comfortaa.variable}`}>
      <body>{children}</body>
    </html>
  );
}
