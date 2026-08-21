"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Explicit opt-in save. Generated readings are NOT saved by default; the
 * retention period (configurable, currently 90 days) applies from the moment
 * the user saves. Both save and delete are explicit user actions.
 */
export default function SaveDeleteButtons({
  id,
  initiallySaved,
}: {
  id: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (saved || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/readings/${id}`, { method: "PATCH" });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Delete this reading and all stored birth data? This cannot be undone.")) return;
    setBusy(true);
    try {
      await fetch(`/api/readings/${id}`, { method: "DELETE" });
      router.push("/");
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!saved ? (
        <Button variant="ghost" onClick={save} disabled={busy} className="px-4 py-2 text-sm">
          {busy ? "Saving…" : "Save this reading"}
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold-300">
          Saved
        </span>
      )}
      <Button variant="danger" onClick={del} disabled={busy}>
        {busy ? "Deleting…" : "Delete Reading"}
      </Button>
    </div>
  );
}
