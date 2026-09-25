// Loading placeholders shaped like each signed-in screen, shown the moment a
// tab or a Contact is tapped. Same cards, glass and glow as the real screens,
// with softly pulsing bars where the text will be.
import type { ReactNode } from "react";
import { Glow } from "@/components/today/ListMode";

/** A pulsing bar standing in for text or a control. */
export function Bone({ className, onBrand = false }: { className: string; onBrand?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-full motion-reduce:animate-none ${
        onBrand ? "bg-white/20" : "bg-ink/[0.07]"
      } ${className}`}
    />
  );
}

/** The loading region: announced once to screen readers, then the bones. */
function Loading({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Title and count, as at the top of Contacts. */
function TitleBones({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Bone className={`h-10 ${wide ? "w-56 md:h-14 md:w-80" : "w-44 xl:h-12"}`} />
      <Bone className="h-4 w-28" />
    </div>
  );
}

/** A white card of rows, like a Settings section or the What you know card. */
function CardBones({ rows, glass = false }: { rows: number; glass?: boolean }) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-[28px] p-5 md:p-6 ${glass ? "glass" : "bg-white shadow-card"}`}
    >
      <Bone className="h-6 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-ink/[0.07] pb-3.5 last:border-b-0 last:pb-0">
          <div className="flex flex-1 flex-col gap-2">
            <Bone className={`h-4 ${i % 2 ? "w-2/5" : "w-3/5"}`} />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-9 w-24" />
        </div>
      ))}
    </section>
  );
}

/** The brand card with its glow, as Today's first suggestion and a Contact's header. */
function BrandCardBones({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[30px] bg-brand shadow-brand ${className}`}>
      <Glow className="-right-24 -top-36 h-80 w-80" />
      <div className="relative flex h-full flex-col gap-4 p-[22px] md:gap-[22px] md:px-8 md:py-[30px]">{children}</div>
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <Loading label="Loading Today" className="xl:grid xl:grid-cols-[400px_1fr] xl:items-start xl:gap-14">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Bone className="h-8 w-8 rounded-[10px] md:hidden" />
          <Bone className="h-4 w-36" />
        </div>
        <div className="flex flex-col gap-3 md:gap-5">
          <Bone className="h-11 w-40 md:h-14 md:w-80" />
          <span className="flex h-9 w-44 items-center rounded-full bg-white px-3.5 md:hidden">
            <Bone className="h-3 w-full" />
          </span>
          <Bone className="hidden h-5 w-72 md:block" />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:mt-0 2xl:grid-cols-3">
        <BrandCardBones className="min-h-[300px]">
          <Bone onBrand className="h-8 w-32" />
          <Bone onBrand className="mt-auto h-10 w-44" />
          <Bone onBrand className="h-4 w-36" />
          <Bone onBrand className="h-12 w-full" />
        </BrandCardBones>
        {[0, 1].map((i) => (
          <div key={i} className="hidden min-h-[300px] flex-col gap-4 rounded-[30px] bg-white p-[22px] shadow-card sm:flex">
            <Bone className="h-8 w-32" />
            <Bone className="mt-auto h-10 w-40" />
            <Bone className="h-4 w-32" />
            <Bone className="h-12 w-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function ContactsSkeleton() {
  return (
    <Loading label="Loading contacts" className="xl:grid xl:grid-cols-[280px_1fr] xl:items-start xl:gap-10">
      <div className="flex flex-col gap-6">
        <TitleBones />
        <div className="hidden flex-col gap-6 xl:flex">
          {[5, 4].map((n) => (
            <div key={n} className="glass flex flex-col gap-3 rounded-3xl p-5">
              {Array.from({ length: n }, (_, i) => (
                <Bone key={i} className="h-5 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-[18px] flex flex-col gap-3 xl:mt-0 xl:gap-[18px]">
        <div className="flex h-12 items-center rounded-full bg-white px-[18px] shadow-[0_10px_30px_-20px_rgba(30,40,120,0.4)] xl:h-[52px]">
          <Bone className="h-4 w-32" />
        </div>
        <div className="flex gap-2 overflow-hidden xl:hidden">
          {["w-24", "w-20", "w-16", "w-20"].map((w, i) => (
            <span key={i} className="flex h-10 shrink-0 items-center rounded-full bg-white px-4">
              <Bone className={`h-3.5 ${w}`} />
            </span>
          ))}
        </div>
        <ul className="mt-1 overflow-hidden rounded-3xl bg-white px-4 xl:glass xl:mt-0 xl:rounded-[28px] xl:px-6">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex h-16 items-center gap-3 border-b border-ink/[0.07] last:border-b-0 xl:h-[60px]">
              <Bone className="h-9 w-9 rounded-xl xl:hidden" />
              <div className="flex flex-1 flex-col gap-2">
                <Bone className={`h-4 ${i % 3 === 0 ? "w-2/5" : i % 3 === 1 ? "w-1/3" : "w-1/2"}`} />
                <Bone className="h-3 w-1/4 xl:hidden" />
              </div>
              <Bone className="h-10 w-[92px]" />
            </li>
          ))}
        </ul>
      </div>
    </Loading>
  );
}

export function ContactSkeleton() {
  return (
    <Loading label="Loading contact" className="flex flex-col gap-3.5 md:gap-[22px]">
      <div className="glass flex h-11 w-11 items-center justify-center rounded-full md:h-10 md:w-32">
        <Bone className="h-4 w-4 md:w-20" />
      </div>
      <BrandCardBones className="md:rounded-[34px]">
        <Bone onBrand className="h-8 w-44 md:h-[34px]" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="flex flex-col gap-3">
            <Bone onBrand className="h-14 w-52 md:h-24 md:w-96" />
            <Bone onBrand className="h-4 w-40 md:hidden" />
          </div>
          <div className="flex gap-2 md:gap-2.5">
            <Bone onBrand className="h-[52px] w-[52px] md:w-28" />
            <span className="h-[52px] flex-1 animate-pulse rounded-full bg-white/90 motion-reduce:animate-none md:w-36 md:flex-none" />
          </div>
        </div>
      </BrandCardBones>
      <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start md:gap-[22px]">
        <CardBones rows={3} />
        <CardBones rows={2} glass />
      </div>
    </Loading>
  );
}

export function SettingsSkeleton() {
  return (
    <Loading label="Loading settings" className="flex flex-col gap-6">
      <TitleBones wide />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-4">
          <CardBones rows={4} />
          <CardBones rows={2} />
        </div>
        <CardBones rows={3} glass />
      </div>
    </Loading>
  );
}
