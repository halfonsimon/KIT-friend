"use client";

import { useState } from "react";

type Props = {
  contactId: string;
  contactName: string;
  aiSummary: string | null;
  keyTopics: string[];
  followUps: string[];
};

export default function ContactBriefing({
  contactId,
  contactName,
  aiSummary,
  keyTopics,
  followUps,
}: Props) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateBriefing = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/briefing`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.data?.briefing || "No briefing available.");
      }
    } catch (error) {
      console.error("Failed to generate briefing:", error);
      setBriefing("Failed to generate briefing.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasSummary = aiSummary || keyTopics.length > 0 || followUps.length > 0;

  if (!hasSummary) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-sm">
            No AI summary yet. Add notes when you touch base to build up context!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <span className="font-medium text-indigo-900">AI Memory</span>
        </div>
        <svg
          className={`w-5 h-5 text-indigo-600 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary */}
          {aiSummary && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">
                Summary
              </h4>
              <p className="text-sm text-slate-700">{aiSummary}</p>
            </div>
          )}

          {/* Key Topics */}
          {keyTopics.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-2">
                Key Topics
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-white/60 rounded-full text-xs font-medium text-indigo-700 border border-indigo-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {followUps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-2">
                Follow Up On
              </h4>
              <ul className="space-y-1">
                {followUps.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg
                      className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generate Briefing Button */}
          <button
            onClick={generateBriefing}
            disabled={isLoading}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Briefing for {contactName}
              </>
            )}
          </button>

          {/* Briefing Result */}
          {briefing && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
              <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Before You Call
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-line">{briefing}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
