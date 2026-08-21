import Link from "next/link";
import { brand } from "@/lib/config";
import { TestingBadge } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="border-b border-gold/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="font-display text-xl font-medium tracking-wideish text-parchment-100">
          {brand.name}
        </Link>
        <nav aria-label="Site" className="flex items-center gap-5 text-sm text-silver-moon">
          <Link href="/about/method" className="hover:text-gold-300">Methodology</Link>
          <Link href="/privacy" className="hover:text-gold-300">Privacy</Link>
          <Link href="/reading/new" className="rounded-full border border-gold/50 px-4 py-1.5 text-gold-300 hover:bg-gold/10">
            Begin a Reading
          </Link>
          <TestingBadge />
        </nav>
      </div>
    </header>
  );
}
