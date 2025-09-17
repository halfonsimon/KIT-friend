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
    <div className="space-y-4">
      <button
        onClick={send}
        disabled={status === "sending"}
        className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {status === "sending" ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Sending...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send Test Email
          </>
        )}
      </button>

      {msg && (
        <div
          className={`p-4 rounded-lg border ${
            status === "err"
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <p
            className={`text-sm flex items-center ${
              status === "err" ? "text-red-700" : "text-green-700"
            }`}
          >
            {status === "err" ? (
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {msg}
          </p>
        </div>
      )}
    </div>
  );
}
