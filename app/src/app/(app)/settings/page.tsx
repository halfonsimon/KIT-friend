// src/app/(app)/settings/page.tsx
import { getSettings } from "@/lib/settings";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-slate-600">
        Configure digest and category defaults. Overdue & Today are always
        unlimited.
      </p>

      <form action={updateSettings} className="mt-6 space-y-6 max-w-xl">
        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Digest</h2>
          <label className="mt-3 block text-sm">
            Upcoming count (email & preview)
            <input
              type="number"
              name="upcomingCount"
              min={0}
              max={50}
              defaultValue={s.upcomingCount}
              className="mt-1 w-40 rounded-md border px-2 py-1"
            />
          </label>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sendEmailDigest"
                  defaultChecked={s.sendEmailDigest}
                />
                Send daily digest by Email
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sendWhatsappDigest"
                  defaultChecked={s.sendWhatsappDigest}
                />
                Send daily digest by WhatsApp
              </label>
            </div>

            <div>
              <label className="block text-sm">
                Digest time (24h format)
                <input
                  type="time"
                  name="digestTime"
                  defaultValue={s.digestTime}
                  className="mt-1 w-32 rounded-md border px-2 py-1"
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Time when the daily digest will be sent (if enabled)
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Overdue & Today are always shown in full; only Upcoming is limited.
          </p>
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Category defaults (days)</h2>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm">
              FAMILY
              <input
                type="number"
                name="family"
                min={1}
                max={365}
                defaultValue={s.defaultsByCategory.FAMILY}
                className="mt-1 w-40 rounded-md border px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              FRIEND
              <input
                type="number"
                name="friend"
                min={1}
                max={365}
                defaultValue={s.defaultsByCategory.FRIEND}
                className="mt-1 w-40 rounded-md border px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              WORK
              <input
                type="number"
                name="work"
                min={1}
                max={365}
                defaultValue={s.defaultsByCategory.WORK}
                className="mt-1 w-40 rounded-md border px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              OTHER
              <input
                type="number"
                name="other"
                min={1}
                max={365}
                defaultValue={s.defaultsByCategory.OTHER}
                className="mt-1 w-40 rounded-md border px-2 py-1"
              />
            </label>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Used to prefill new contacts. If you edit a contact’s interval, that
            value wins.
          </p>
        </section>

        <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
          Save settings
        </button>
      </form>
    </main>
  );
}
