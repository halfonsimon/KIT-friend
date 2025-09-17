// src/app/digest/SendDigestButton.tsx
"use client";

import { useState } from "react";

type SendResult = { ok?: boolean; sent?: string[]; error?: string };

export default function SendDigestButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function send() {
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/digest/send", { method: "POST" });
      const j = (await res.json()) as SendResult;
      if (res.ok && j.ok) {
        setStatus("ok");
        setMsg(`Sent to: ${(j.sent ?? []).join(", ")}`);
      } else {
        setStatus("err");
        setMsg(j.error || "Failed to send.");
      }
    } catch (e: unknown) {
      setStatus("err");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={send}
        disabled={status === "sending"}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send me this digest"}
      </button>
      {msg && (
        <p
          className={`mt-2 text-sm ${
            status === "err" ? "text-red-600" : "text-slate-600"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
