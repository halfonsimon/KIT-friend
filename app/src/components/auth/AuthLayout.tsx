import type { ReactNode } from "react";
import BrandMark from "@/components/ui/BrandMark";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";
import { Glow } from "@/components/today/ListMode";

/** Sign in and Create account: the ultramarine story on the left, the form on the right. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ground p-4 md:grid md:grid-cols-2 md:gap-5 md:p-5">
      {/* Phone: a short card on top */}
      <div className="relative flex h-[200px] flex-col justify-between overflow-hidden rounded-[30px] bg-brand p-[22px] text-white md:hidden">
        <Glow className="-right-20 -top-32 h-72 w-72" />
        <div className="relative flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="text-lg font-extrabold">KIT Friend</span>
        </div>
        <p className="relative text-[28px] font-extrabold leading-[1.1] tracking-[-0.04em]">
          Keep in touch with the people who matter.
        </p>
      </div>

      {/* Wide screens: the full-height story */}
      <div className="relative hidden min-h-[calc(100vh-40px)] flex-col overflow-hidden rounded-[36px] bg-brand p-12 text-white shadow-[0_40px_70px_-40px_rgba(53,71,209,0.8)] md:flex">
        <Glow className="-right-24 -top-40 h-[420px] w-[420px]" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={36} />
          <span className="text-xl font-extrabold">KIT Friend</span>
        </div>
        <div className="flex-1" />
        {/* A glimpse of Today */}
        <div aria-hidden="true" className="relative h-[260px]">
          <div className="absolute left-0 top-0 flex w-[360px] max-w-full flex-col gap-2.5 rounded-[26px] border border-white/25 bg-white/15 p-[22px]">
            <span className="text-[44px] font-extrabold leading-none tracking-[-0.05em]">Noa</span>
            <span className="text-sm text-brand-soft">Family, last talked 27 March</span>
          </div>
          <div className="absolute left-[150px] top-[132px] flex h-14 items-center gap-2.5 whitespace-nowrap rounded-full bg-white pl-2.5 pr-5 text-ink shadow-[0_20px_40px_-18px_rgba(14,16,36,0.5)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ground text-brand">
              <Icon name="chat" size={17} />
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted">For your next call</span>
              <span className="text-sm font-bold">Did she get the UX job?</span>
            </span>
          </div>
          <div className="absolute left-10 top-[204px] flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-white pl-2 pr-4 text-sm font-bold text-ink shadow-[0_20px_40px_-18px_rgba(14,16,36,0.5)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
              <Icon name="check" size={14} strokeWidth={3} />
            </span>
            3 of 3 done today
          </div>
        </div>
        <div className="flex-1" />
        <p className="relative max-w-[520px] text-[44px] font-extrabold leading-[1.05] tracking-[-0.045em]">
          Keep in touch with the people who matter.
        </p>
        <p className="relative mt-3.5 max-w-[480px] text-[17px] leading-normal text-brand-soft">
          A few people a day, what to ask them, and a note of what you talked about.
        </p>
      </div>

      <main className="flex items-center justify-center px-1 pb-8 pt-[26px] md:p-0">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="display text-[32px] leading-[1.05] md:text-[40px]">{title}</h1>
      <p className="text-base leading-normal text-muted">{lead}</p>
    </div>
  );
}

export function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClass("white", "lg", "h-[54px] border-[1.5px] border-field shadow-none")}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {label}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span className="h-px flex-1 bg-field" />
      or with email
      <span className="h-px flex-1 bg-field" />
    </div>
  );
}

export function AuthField({
  id,
  label,
  ...input
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        {...input}
        className="h-[54px] w-full rounded-2xl border-[1.5px] border-field bg-white px-[18px] text-base text-ink outline-none focus:border-brand"
      />
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
      {message}
    </p>
  );
}
