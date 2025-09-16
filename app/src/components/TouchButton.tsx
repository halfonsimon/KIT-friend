"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; disabled?: boolean };

export default function TouchButton({ id, disabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${id}/touch`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      // Re-render server component with fresh data
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled || isPending}
        className="rounded-md border px-3 py-1 text-sm
                   bg-white hover:bg-slate-50 disabled:opacity-50"
        title="Set lastContactedAt to now"
      >
        {isPending ? "Saving…" : "Touched"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
