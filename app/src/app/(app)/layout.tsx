// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

// Simple top navigation
function Nav() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          KIT — Keep In Touch
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100"
            href="/contacts"
          >
            Contacts
          </Link>
          <Link
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100"
            href="/digest"
          >
            Digest
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </>
  );
}
