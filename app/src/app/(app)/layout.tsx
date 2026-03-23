// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { auth } from "@/auth";
import SignOutButton from "@/components/SignOutButton";

async function Nav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-3 text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors"
            >
              <Logo size="sm" animated={true} />
              <span className="hidden sm:block bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
                Keep In Touch
              </span>
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

            {session?.user && (
              <div className="flex items-center ml-3 pl-3 border-l border-slate-200">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-7 h-7 rounded-full mr-2"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2">
                    {(session.user.name?.[0] || session.user.email?.[0] || "?").toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-slate-700 mr-2 max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <SignOutButton />
              </div>
            )}
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
