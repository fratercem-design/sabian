import type { ReactNode } from "react";

export interface StepDescriptor {
  /** 1-based step number. */
  n: number;
  label: string;
  /** Plain-language purpose, shown on the current step. */
  purpose: string;
}

/**
 * Ordered progress indicator for the reading intake.
 *
 * The current step is marked with aria-current="step" and also carries a
 * visible "Step N of M" label, so progress is never conveyed by colour alone.
 */
export function Stepper({ steps, current }: { steps: StepDescriptor[]; current: number }) {
  const active = steps.find((s) => s.n === current);
  return (
    <div className="mb-8">
      <nav aria-label="Reading progress">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">
          Step {current} of {steps.length}
          {active ? ` · ${active.label}` : ""}
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          {steps.map((s, i) => {
            const done = s.n < current;
            const isCurrent = s.n === current;
            return (
              <li key={s.n} className="flex items-center gap-2">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                    isCurrent
                      ? "border-gold bg-gold/20 font-semibold text-gold-300"
                      : done
                        ? "border-gold/60 bg-gold/10 text-gold-300"
                        : "border-silver-mist/40 text-silver-moon"
                  }`}
                >
                  <span className="sr-only">
                    {isCurrent ? "Current step: " : done ? "Completed step: " : "Upcoming step: "}
                    {s.label}
                  </span>
                  <span aria-hidden="true">{done ? "✓" : s.n}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`hidden text-[13px] sm:inline ${
                    isCurrent ? "text-parchment-100" : done ? "text-parchment-200" : "text-silver-moon"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="h-px w-5 bg-gold/25 sm:w-8" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {active && <StepPurpose>{active.purpose}</StepPurpose>}
    </div>
  );
}

function StepPurpose({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-relaxed text-silver-moon">{children}</p>;
}
