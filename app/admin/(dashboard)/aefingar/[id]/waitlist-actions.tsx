"use client";

import { useState, useTransition } from "react";
import { notifyWaitlistEntry, promoteWaitlistEntry, removeWaitlistEntry } from "@/app/actions/admin-waitlist";

export function PromoteWaitlistButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function promote() {
    setError(null);
    startTransition(async () => {
      const result = await promoteWaitlistEntry(entryId);
      if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={promote}
        className="text-gold-dark hover:underline disabled:opacity-50"
      >
        {isPending ? "Færi..." : "Færa á bókanalista"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

export function NotifyWaitlistButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => notifyWaitlistEntry(entryId))}
      className="text-gold-dark hover:underline disabled:opacity-50"
    >
      Senda tilkynningu
    </button>
  );
}

export function RemoveWaitlistButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Fjarlægja af biðlista?")) {
          startTransition(() => removeWaitlistEntry(entryId));
        }
      }}
      className="text-red-700 hover:underline disabled:opacity-50"
    >
      Fjarlægja
    </button>
  );
}
