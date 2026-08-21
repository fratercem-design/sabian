"use client";

import { useEffect, useState } from "react";
import type { Reading } from "@/lib/types";

const STAGES: Array<{ key: string; label: string }> = [
  { key: "resolving-place", label: "Resolving birthplace" },
  { key: "converting-time", label: "Converting historical time" },
  { key: "calculating-chart", label: "Calculating the natal chart" },
  { key: "finding-symbols", label: "Finding the relevant Sabian Symbols" },
  { key: "composing-interpretation", label: "Composing the interpretation" },
  { key: "creating-artwork", label: "Creating symbolic artwork" },
  { key: "weaving-story", label: "Weaving the personal story" },
];

export default function ReadingClient({
  initial,
  initialId,
}: {
  initial: Reading | null;
  initialId: string;
}) {
  const [reading, setReading] = useState<Reading | null>(initial);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reading && reading.status === "ready") return;
    let cancelled = false;
    // Advance the visual stage every ~1.2s while generation is in flight.
    const stageTimer = setInterval(() => {
      if (!cancelled) setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 1200);
    const poll = async () => {
      try {
        const res = await fetch(`/api/readings/${initialId}`);
        const data = (await res.json()) as { reading?: Reading; error?: string };
        if (cancelled) return;
        if (!data.reading) {
          setError(data.error ?? "Reading not found.");
          return;
        }
        setReading(data.reading);
        if (data.reading.status === "ready") return;
        if (data.reading.status === "failed") {
          setError(data.reading.error ?? "Generation failed. Your calculated chart is preserved below.");
          return;
        }
        setTimeout(poll, 1200);
      } catch {
        if (!cancelled) setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearInterval(stageTimer);
    };
  }, [reading, initialId]);

  // Generation progress view.
  if (reading && reading.status !== "ready" && !error) {
    const current = STAGES[Math.min(stageIndex, STAGES.length - 1)];
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-8 h-16 w-16 animate-pulse rounded-full border border-gold/40 border-t-gold" aria-hidden="true" />
        <h1 className="font-display text-2xl text-parchment-100">Weaving your story</h1>
        <p className="mt-3 text-silver-moon">{current.label}</p>
        <ol className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm">
          {STAGES.map((s, i) => (
            <li
              key={s.key}
              className={`flex items-center gap-2 ${i <= stageIndex ? "text-gold-300" : "text-silver-mist"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${i <= stageIndex ? "bg-gold-300" : "bg-silver-mist/40"}`}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return null; // The server component renders the ready/failed states.
}

export { STAGES };
