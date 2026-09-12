import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { brand, siteUrl } from "@/lib/config";

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

const DESCRIPTION =
  "The Psyche Symbols transforms your birth information into a calculated natal chart, a personalized Psyche Symbol reading, original artwork, and a mythic story — one image at a time.";

export const metadata: Metadata = {
  // Absolute URLs for canonical and social metadata are resolved from here.
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s — ${brand.name}`,
  },
  description: DESCRIPTION,
  applicationName: brand.name,
  alternates: { canonical: "/" },
  // Public surfaces are indexable; /reading/* and /dev/* override this with
  // their own noindex metadata and matching response headers.
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} — ${brand.tagline}`,
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Reflection and self-inquiry, not fortune-telling. Stated once, here, so
  // every surface inherits it.
  category: "lifestyle",
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
