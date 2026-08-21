import Link from "next/link";
import type { ReactNode } from "react";

export function TestingBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs tracking-wideish text-gold-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-300" />
      Testing Preview
    </span>
  );
}

export function DemoArtworkBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-dust/40 bg-violet-deep/40 px-2.5 py-0.5 text-[11px] tracking-wideish text-silver-moon">
      Demo artwork — deterministic emblem, not AI-generated
    </span>
  );
}

export function DemoTextBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-dust/40 bg-violet-deep/40 px-2.5 py-0.5 text-[11px] tracking-wideish text-silver-moon">
      Demo interpretation — deterministic text, not AI-generated
    </span>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  type,
  onClick,
  disabled,
  id,
}: {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  id?: string;
}) {
  const styles = {
    primary:
      "inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3 font-semibold text-midnight-900 shadow-glow transition hover:bg-gold-400 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60",
    ghost:
      "inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 px-7 py-3 font-medium text-gold-300 transition hover:bg-gold/10",
    danger:
      "inline-flex items-center justify-center gap-2 rounded-full border border-ember/60 px-5 py-2 text-sm text-ember transition hover:bg-ember/10",
  }[variant];

  const cls = `${styles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} id={id}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={cls} onClick={onClick} disabled={disabled} id={id}>
      {children}
    </button>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-24 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-gold-400">{children}</p>
  );
}
