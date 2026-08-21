import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s — ${brand.name}`,
  },
  description:
    "The Sabian Story transforms your birth information into a calculated natal chart, a personalized Sabian Symbol reading, original artwork, and a mythic story — one image at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-midnight text-parchment-200 font-body antialiased">
        <div className="bg-grain pointer-events-none fixed inset-0 opacity-60" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
