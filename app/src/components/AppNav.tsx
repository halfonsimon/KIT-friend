"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import BrandMark from "@/components/ui/BrandMark";
import Icon, { type IconName } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";

type Section = { href: string; label: string; icon: IconName; matches: (path: string) => boolean };

const sections: Section[] = [
  { href: "/", label: "Today", icon: "today", matches: (p) => p === "/" },
  { href: "/contacts", label: "Contacts", icon: "contacts", matches: (p) => p.startsWith("/contacts") },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    // The digest preview lives under Settings until it moves onto the Settings page.
    matches: (p) => p.startsWith("/settings") || p.startsWith("/digest"),
  },
];

export type NavUser = { name: string | null; email: string | null; image: string | null };

function tabClass(active: boolean) {
  return active ? "bg-ink text-white" : "text-ink hover:bg-white/80";
}

function AccountMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white text-ink shadow-float"
      >
        {user.image ? (
          <Image src={user.image} alt="" width={44} height={44} referrerPolicy="no-referrer" />
        ) : (
          <Icon name="user" size={20} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-14 w-64 rounded-3xl bg-white p-4 shadow-card">
          <p className="truncate text-[15px] font-bold">{user.name || "Your account"}</p>
          {user.email && <p className="truncate text-sm text-muted">{user.email}</p>}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={buttonClass("soft", "sm", "mt-4 w-full")}
          >
            <Icon name="signOut" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppNav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: floating glass bar at the top. */}
      <header className="sticky top-4 z-40 mx-4 hidden md:block lg:mx-10">
        <div className="glass grid h-[68px] grid-cols-[1fr_auto_1fr] items-center rounded-full pl-5 pr-3">
          <Link href="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
            <BrandMark size={34} />
            KIT Friend
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {sections.map((s) => {
              const active = s.matches(pathname);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-bold transition-colors ${tabClass(active)}`}
                >
                  <Icon name={s.icon} size={18} />
                  {s.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-end gap-2.5">
            <Link href="/contacts/new" className={buttonClass("brand", "sm")}>
              <Icon name="plus" size={18} />
              Add contact
            </Link>
            {user && <AccountMenu user={user} />}
          </div>
        </div>
      </header>

      {/* Phone: floating glass bar at the bottom, over a fade so lists scroll away under it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[150px] bg-linear-to-b from-ground/0 to-ground to-55% md:hidden"
      />
      <nav
        aria-label="Main"
        className="glass fixed inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 grid h-16 grid-cols-3 gap-1 rounded-full p-1.5 md:hidden"
      >
        {sections.map((s) => {
          const active = s.matches(pathname);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition-colors ${tabClass(active)}`}
            >
              <Icon name={s.icon} size={18} />
              {s.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
