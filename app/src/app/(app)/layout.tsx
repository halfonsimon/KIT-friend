// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

// Modern navigation with blue theme
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-white text-sm font-bold">K</span>
              </div>
              <span className="hidden sm:block">Keep In Touch</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              href="/contacts"
            >
              Contacts
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              href="/digest"
            >
              Digest
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              href="/settings"
            >
              Settings
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
