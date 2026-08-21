"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
    <Button variant="danger" onClick={del} disabled={busy}>
      {busy ? "Deleting…" : "Delete Reading"}
    </Button>
  );
}
