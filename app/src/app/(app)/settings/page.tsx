// src/app/(app)/settings/page.tsx
import { getSettings } from "@/lib/settings";
import { updateSettings } from "./actions";
import { requireUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUser();
  const s = await getSettings(userId);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">
          Configure your digest preferences and default intervals for contact
          categories.
        </p>
      </div>

      <form action={updateSettings} className="space-y-8">
        {/* Digest Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-600"
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
              </div>
              <h2 className="text-xl font-bold text-slate-900">Daily Digest</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Upcoming Contacts Count
                </label>
                <input
                  type="number"
                  name="upcomingCount"
                  min={0}
                  max={50}
                  defaultValue={s.upcomingCount}
                  className="w-32 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  How many upcoming contacts to show in emails and previews
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <input
                    id="sendEmailDigest"
                    type="checkbox"
                    name="sendEmailDigest"
                    defaultChecked={s.sendEmailDigest}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="sendEmailDigest"
                      className="text-sm font-medium text-slate-900"
                    >
                      Email Digest
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Receive daily digest via email
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Digest Time
                  </label>
                  <input
                    type="time"
                    name="digestTime"
                    defaultValue={s.digestTime}
                    className="w-40 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Time when the daily digest will be sent (24-hour format)
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Keep your scheduler aligned with this time in your deploy
                    environment.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 flex items-start">
                  <svg
                    className="w-4 h-4 mr-2 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Overdue and Today contacts are always shown in full. Only the
                  Upcoming section is limited by the count above.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Defaults */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Category Defaults
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  key: "family",
                  label: "Family",
                  value: s.defaultsByCategory.FAMILY,
                  color: "bg-red-100 text-red-700",
                },
                {
                  key: "friend",
                  label: "Friend",
                  value: s.defaultsByCategory.FRIEND,
                  color: "bg-blue-100 text-blue-700",
                },
                {
                  key: "work",
                  label: "Work",
                  value: s.defaultsByCategory.WORK,
                  color: "bg-purple-100 text-purple-700",
                },
                {
                  key: "other",
                  label: "Other",
                  value: s.defaultsByCategory.OTHER,
                  color: "bg-gray-100 text-gray-700",
                },
              ].map(({ key, label, value, color }) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Default Interval (days)
                    </label>
                    <input
                      type="number"
                      name={key}
                      min={1}
                      max={365}
                      defaultValue={value}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-start">
                <svg
                  className="w-4 h-4 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                These defaults are used when creating new contacts. You can
                always customize the interval for individual contacts.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
          >
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
