export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        KIT — Keep In Touch
      </h1>
      <p className="mt-2 text-slate-600">
        A tiny tool to help you stay in touch. Configure contacts, set
        intervals, and quickly see who is overdue, due today, or upcoming.
      </p>

      <div className="mt-6">
        <a
          href="/contacts"
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          Open contacts
        </a>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Data is computed on the server and stored via Prisma/SQLite. You can
        also inspect the raw data at{" "}
        <a href="/api/contacts" className="underline hover:text-slate-500">
          /api/contacts
        </a>
        .
      </p>
    </main>
  );
}
